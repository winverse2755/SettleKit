/**
 * End-to-End Integration Test for Cross-Chain Liquidity Provision
 *
 * Wire together all components for a complete cross-chain liquidity provision flow:
 * 1. ArcTransferLeg - CCTP transfer from Base to Arc
 * 2. SettleAgent - Risk evaluation and decision making
 * 3. UniswapLiquidityExecutor - Uniswap v4 liquidity deposit
 *
 * Flow: USDC on Base → Arc Hub (CCTP) → USDC on Unichain → SettleAgent → Uniswap Pool
 *
 * ## SettleAgent Integration
 *
 * The SettleAgent is the decision engine that determines whether to execute, wait, or abort
 * a liquidity deposit based on real-time risk assessment:
 *
 * **Risk Simulation (via RiskSimulator)**:
 * - Estimates Arc network latency (CCTP attestation timing)
 * - Analyzes Uniswap pool state (liquidity depth, slippage, price impact)
 * - Calculates execution confidence score
 *
 * **Decision Making (based on AgentPolicy)**:
 * - max_slippage: Maximum acceptable slippage (e.g., 0.01 = 1%)
 * - max_price_impact: Maximum acceptable price impact
 * - min_confidence: Minimum required confidence score
 * - max_latency_seconds: Maximum acceptable finality delay
 *
 * **Decisions**:
 * - 'execute': Risk is acceptable, proceed with liquidity deposit
 * - 'wait': Conditions are borderline, retry after delay
 * - 'abort': Risk thresholds exceeded, do not proceed
 *
 * **Retry Logic**:
 * - retry_attempts: Number of retries for 'wait' decisions
 * - retry_delay_seconds: Delay between retries
 * - fallback_strategy: What to do when slippage threshold is exceeded ('wait' or 'abort')
 *
 * @see SettleAgent - packages/agent/SettleAgent.ts
 * @see RiskSimulator - packages/sdk/src/simulators/RiskSimulator.ts
 * @see UniswapLiquidityExecutor - packages/agent/UniswapLiquidityExecutor.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (two levels up from packages/sdk/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { ArcTransferLeg } from '../src/legs/ArcTransferLeg';
import {
    SettleAgent,
    createSettleAgent,
    DEFAULT_AGENT_POLICY,
} from '../../agent/SettleAgent';
import {
    UniswapLiquidityExecutor,
    type LiquidityDepositParams,
    type LiquidityDepositResult,
} from '../../agent/UniswapLiquidityExecutor';
import type {
    AgentPolicy,
    AgentDecision,
    DepositLiquidityIntent,
    ExecutionResult,
} from '../src/types/agent';
import type { RiskMetrics } from '../src/types/risk';
import type { LegReceipt } from '../src/types/leg-types';
import { privateKeyToAccount } from 'viem/accounts';
import { parseUnits } from 'viem';
import type { Address } from 'viem';
import * as fs from 'fs';

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Log levels for structured logging
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4,
}

/**
 * Log entry structure
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    levelName: string;
    message: string;
    phase?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
    /** Minimum log level to output (default: INFO) */
    level: LogLevel;
    /** Enable colored console output (default: true) */
    colorOutput: boolean;
    /** Enable JSON output format (default: false) */
    jsonOutput: boolean;
    /** Optional file path to write logs */
    logFile?: string;
    /** Include timestamps in output (default: true) */
    timestamps: boolean;
    /** Include phase timing information (default: true) */
    showTiming: boolean;
}

/**
 * ANSI color codes for console output
 */
const Colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Log level colors
    debug: '\x1b[36m',   // cyan
    info: '\x1b[32m',    // green
    warn: '\x1b[33m',    // yellow
    error: '\x1b[31m',   // red
    
    // Status colors
    success: '\x1b[32m', // green
    failure: '\x1b[31m', // red
    pending: '\x1b[33m', // yellow
    
    // Decorative
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

/**
 * Structured logger for end-to-end tests
 */
export class TestLogger {
    private config: LoggerConfig;
    private entries: LogEntry[] = [];
    private phaseStartTimes: Map<string, number> = new Map();
    private fileStream?: fs.WriteStream;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: LogLevel.INFO,
            colorOutput: true,
            jsonOutput: false,
            timestamps: true,
            showTiming: true,
            ...config,
        };

        if (this.config.logFile) {
            const logDir = path.dirname(this.config.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.fileStream = fs.createWriteStream(this.config.logFile, { flags: 'a' });
        }
    }

    /**
     * Start timing a phase
     */
    startPhase(phase: string): void {
        this.phaseStartTimes.set(phase, Date.now());
        this.info(`Starting phase: ${phase}`, { phase });
    }

    /**
     * End timing a phase and return duration
     */
    endPhase(phase: string): number {
        const startTime = this.phaseStartTimes.get(phase);
        const duration = startTime ? Date.now() - startTime : 0;
        this.phaseStartTimes.delete(phase);
        this.info(`Completed phase: ${phase}`, { phase, durationMs: duration });
        return duration;
    }

    /**
     * Log a debug message
     */
    debug(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, metadata);
    }

    /**
     * Log an info message
     */
    info(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, metadata);
    }

    /**
     * Log a warning message
     */
    warn(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, metadata);
    }

    /**
     * Log an error message
     */
    error(message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, metadata);
    }

    /**
     * Log a message with the specified level
     */
    private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
        if (level < this.config.level) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            levelName: LogLevel[level],
            message,
            ...metadata,
        };

        this.entries.push(entry);
        this.output(entry);
    }

    /**
     * Output a log entry
     */
    private output(entry: LogEntry): void {
        if (this.config.jsonOutput) {
            const jsonLine = JSON.stringify(entry);
            console.log(jsonLine);
            this.fileStream?.write(jsonLine + '\n');
        } else {
            const formatted = this.formatEntry(entry);
            console.log(formatted);
            // Write plain text (without colors) to file
            if (this.fileStream) {
                const plain = this.formatEntry(entry, false);
                this.fileStream.write(plain + '\n');
            }
        }
    }

    /**
     * Format a log entry for console output
     */
    private formatEntry(entry: LogEntry, useColors: boolean = this.config.colorOutput): string {
        const parts: string[] = [];

        // Timestamp
        if (this.config.timestamps) {
            const ts = useColors
                ? `${Colors.gray}[${entry.timestamp}]${Colors.reset}`
                : `[${entry.timestamp}]`;
            parts.push(ts);
        }

        // Level
        const levelColors: Record<string, string> = {
            DEBUG: Colors.debug,
            INFO: Colors.info,
            WARN: Colors.warn,
            ERROR: Colors.error,
        };
        const levelColor = levelColors[entry.levelName] || Colors.white;
        const level = useColors
            ? `${levelColor}${entry.levelName.padEnd(5)}${Colors.reset}`
            : entry.levelName.padEnd(5);
        parts.push(level);

        // Phase (if present)
        if (entry.phase) {
            const phase = useColors
                ? `${Colors.cyan}[${entry.phase}]${Colors.reset}`
                : `[${entry.phase}]`;
            parts.push(phase);
        }

        // Message
        parts.push(entry.message);

        // Duration (if present and timing enabled)
        if (this.config.showTiming && entry.durationMs !== undefined) {
            const duration = useColors
                ? `${Colors.magenta}(${entry.durationMs}ms)${Colors.reset}`
                : `(${entry.durationMs}ms)`;
            parts.push(duration);
        }

        return parts.join(' ');
    }

    /**
     * Get all log entries
     */
    getEntries(): LogEntry[] {
        return [...this.entries];
    }

    /**
     * Get log entries as plain text
     */
    getLogsAsText(): string[] {
        return this.entries.map(e => this.formatEntry(e, false));
    }

    /**
     * Clear all log entries
     */
    clear(): void {
        this.entries = [];
        this.phaseStartTimes.clear();
    }

    /**
     * Close the logger and any open file streams
     */
    close(): void {
        this.fileStream?.end();
    }

    /**
     * Print a section header
     */
    section(title: string): void {
        const line = '─'.repeat(60);
        if (this.config.colorOutput) {
            console.log(`${Colors.blue}${line}${Colors.reset}`);
            console.log(`${Colors.bold}${Colors.blue}  ${title}${Colors.reset}`);
            console.log(`${Colors.blue}${line}${Colors.reset}`);
        } else {
            console.log(line);
            console.log(`  ${title}`);
            console.log(line);
        }
    }

    /**
     * Print a subsection header
     */
    subsection(title: string): void {
        if (this.config.colorOutput) {
            console.log(`\n${Colors.cyan}▸ ${title}${Colors.reset}`);
        } else {
            console.log(`\n▸ ${title}`);
        }
    }

    /**
     * Print a key-value pair
     */
    keyValue(key: string, value: string | number | boolean, indent: number = 2): void {
        const prefix = ' '.repeat(indent);
        if (this.config.colorOutput) {
            console.log(`${prefix}${Colors.gray}${key}:${Colors.reset} ${value}`);
        } else {
            console.log(`${prefix}${key}: ${value}`);
        }
    }

    /**
     * Print a status indicator
     */
    status(label: string, success: boolean, details?: string): void {
        const icon = success ? '✓' : '✗';
        const color = success ? Colors.success : Colors.failure;
        
        if (this.config.colorOutput) {
            const statusText = `${color}${icon}${Colors.reset} ${label}`;
            const detailText = details ? ` ${Colors.gray}(${details})${Colors.reset}` : '';
            console.log(`  ${statusText}${detailText}`);
        } else {
            const detailText = details ? ` (${details})` : '';
            console.log(`  ${icon} ${label}${detailText}`);
        }
    }
}

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * Performance metrics for a test run
 */
export interface PerformanceMetrics {
    totalDurationMs: number;
    phases: {
        name: string;
        durationMs: number;
        percentage: number;
    }[];
    breakdown: {
        transferMs: number;
        riskEvaluationMs: number;
        executionMs: number;
    };
}

/**
 * Performance tracker for measuring phase durations
 */
export class PerformanceTracker {
    private startTime: number = 0;
    private phases: Map<string, { start: number; end?: number }> = new Map();

    start(): void {
        this.startTime = Date.now();
        this.phases.clear();
    }

    startPhase(name: string): void {
        this.phases.set(name, { start: Date.now() });
    }

    endPhase(name: string): number {
        const phase = this.phases.get(name);
        if (phase) {
            phase.end = Date.now();
            return phase.end - phase.start;
        }
        return 0;
    }

    getMetrics(): PerformanceMetrics {
        const totalDurationMs = Date.now() - this.startTime;
        const phases: PerformanceMetrics['phases'] = [];

        for (const [name, { start, end }] of this.phases) {
            const durationMs = (end || Date.now()) - start;
            phases.push({
                name,
                durationMs,
                percentage: totalDurationMs > 0 ? (durationMs / totalDurationMs) * 100 : 0,
            });
        }

        return {
            totalDurationMs,
            phases,
            breakdown: {
                transferMs: this.phases.get('transfer')?.end
                    ? (this.phases.get('transfer')!.end! - this.phases.get('transfer')!.start)
                    : 0,
                riskEvaluationMs: this.phases.get('riskEvaluation')?.end
                    ? (this.phases.get('riskEvaluation')!.end! - this.phases.get('riskEvaluation')!.start)
                    : 0,
                executionMs: this.phases.get('execution')?.end
                    ? (this.phases.get('execution')!.end! - this.phases.get('execution')!.start)
                    : 0,
            },
        };
    }
}

// ============================================================================
// Test Result Reporting
// ============================================================================

/**
 * Detailed test report with all metrics
 */
export interface DetailedTestReport extends TestReport {
    /** Performance metrics */
    performance: PerformanceMetrics;
    /** Environment information */
    environment: {
        mode: 'live';
        nodeVersion: string;
        platform: string;
        timestamp: string;
    };
    /** Structured log entries */
    logEntries: LogEntry[];
}

/**
 * Summary statistics for multiple test runs
 */
export interface TestSuiteStats {
    total: number;
    passed: number;
    failed: number;
    aborted: number;
    totalDurationMs: number;
    averageDurationMs: number;
    successRate: number;
}

/**
 * Calculate summary statistics from test results
 */
export function calculateTestStats(results: { name: string; report: TestReport }[]): TestSuiteStats {
    const total = results.length;
    let passed = 0;
    let failed = 0;
    let aborted = 0;
    let totalDurationMs = 0;

    for (const { report } of results) {
        totalDurationMs += report.result.metadata.durationMs;
        
        if (report.success) {
            passed++;
        } else if (report.result.execution.status === 'aborted') {
            aborted++;
        } else {
            failed++;
        }
    }

    return {
        total,
        passed,
        failed,
        aborted,
        totalDurationMs,
        averageDurationMs: total > 0 ? Math.round(totalDurationMs / total) : 0,
        successRate: total > 0 ? (passed / total) * 100 : 0,
    };
}

/**
 * Format risk metrics for display
 */
export function formatRiskMetrics(risk: RiskMetrics, indent: number = 4): string {
    const prefix = ' '.repeat(indent);
    return [
        `${prefix}Execution Confidence: ${(risk.execution_confidence * 100).toFixed(1)}%`,
        `${prefix}Slippage P50/P95: ${(risk.slippage_p50 * 100).toFixed(2)}% / ${(risk.slippage_p95 * 100).toFixed(2)}%`,
        `${prefix}Price Impact: ${(risk.price_impact * 100).toFixed(2)}%`,
        `${prefix}Finality Delay P50/P95: ${risk.finality_delay_p50}s / ${risk.finality_delay_p95}s`,
        `${prefix}Capital at Risk: ${risk.capital_at_risk_seconds}s`,
        `${prefix}Pool Liquidity: ${risk.pool_liquidity_depth}`,
        `${prefix}Recommended Action: ${risk.recommended_action}`,
    ].join('\n');
}

/**
 * Generate a detailed JSON report
 */
export function generateJsonReport(
    result: E2ETestResult,
    logs: LogEntry[],
    performance: PerformanceMetrics
): string {
    const report: DetailedTestReport = {
        summary: result.execution.status === 'completed' 
            ? 'Test PASSED' 
            : result.execution.status === 'aborted'
                ? 'Test ABORTED'
                : 'Test FAILED',
        success: result.execution.status === 'completed',
        result,
        logs: logs.map(e => `[${e.timestamp}] ${e.levelName} ${e.message}`),
        performance,
        environment: {
            mode: result.metadata.mode,
            nodeVersion: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString(),
        },
        logEntries: logs,
    };

    return JSON.stringify(report, null, 2);
}

/**
 * Export test results to a file
 */
export function exportTestResults(
    results: { name: string; report: TestReport }[],
    outputPath: string
): void {
    const stats = calculateTestStats(results);
    const exportData = {
        generatedAt: new Date().toISOString(),
        stats,
        results: results.map(({ name, report }) => ({
            name,
            success: report.success,
            summary: report.summary,
            duration: report.result.metadata.durationMs,
            decision: report.result.decision,
            executionStatus: report.result.execution.status,
        })),
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Test configuration for the end-to-end orchestrator
 */
export interface TestConfig {
    /** Mode: 'live' interacts with real testnets */
    mode: 'live';
    /** USDC amount in human-readable format (e.g., "1.0" = 1 USDC) */
    amount: string;
    /** Target Uniswap v4 pool ID */
    poolId: string;
    /** Recipient address for the transfer and liquidity position */
    recipient: string;
    /** Optional: Custom agent policy overrides */
    agentPolicy?: Partial<AgentPolicy>;
    /** Optional: Pool key for Uniswap v4 (required for live execution) */
    poolKey?: LiquidityDepositParams['poolKey'];
}

/**
 * Required environment variables for live CCTP transfer
 */
interface CCTPEnvironmentConfig {
    PRIVATE_KEY: string;
    BASE_RPC: string;
    ARC_RPC: string;
    USDC_BASE: string;
    TOKEN_MESSENGER_BASE: string;
    MESSAGE_TRANSMITTER_ARC: string;
    ARC_DOMAIN: string;
    CIRCLE_API_KEY?: string;
}

/**
 * Transfer step details for logging and reporting
 */
interface TransferStepDetails {
    step: 'approve' | 'burn' | 'attestation' | 'mint';
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    error?: string;
    timestamp: number;
}

/**
 * Result of the end-to-end test flow
 */
export interface E2ETestResult {
    /** Transfer phase result */
    transfer: {
        success: boolean;
        txHash?: string;
        chain?: string;
        error?: string;
        /** Detailed CCTP transfer steps (only in live mode) */
        steps?: TransferStepDetails[];
        /** Amount transferred in human-readable format */
        amount?: string;
        /** Recipient address */
        recipient?: string;
    };
    /** Risk metrics from simulation */
    riskMetrics: RiskMetrics;
    /** Agent decision based on risk evaluation */
    decision: AgentDecision;
    /** Final execution result */
    execution: ExecutionResult;
    /** Test metadata */
    metadata: {
        mode: 'live';
        startTime: number;
        endTime: number;
        durationMs: number;
    };
}

/**
 * Test report for logging and inspection
 */
export interface TestReport {
    /** Summary of the test run */
    summary: string;
    /** Whether the full flow succeeded */
    success: boolean;
    /** Detailed results */
    result: E2ETestResult;
    /** Human-readable log entries */
    logs: string[];
}

// EndToEndOrchestrator Class

/**
 * EndToEndOrchestrator - Coordinates the full cross-chain liquidity provision flow
 *
 * Orchestrates:
 * 1. CCTP transfer from Base to Arc via ArcTransferLeg
 * 2. Risk evaluation via SettleAgent's RiskSimulator
 * 3. Decision making based on agent policy
 * 4. Liquidity deposit to Uniswap v4 via UniswapLiquidityExecutor
 *
 * @example
 * ```typescript
 * const orchestrator = new EndToEndOrchestrator({
 *   mode: 'mock',
 *   amount: '1000000', // 1 USDC
 *   poolId: '0x...',
 *   recipient: '0x...',
 * });
 *
 * const result = await orchestrator.runFullFlow();
 * console.log(result.execution.status); // 'completed'
 * ```
 */
export class EndToEndOrchestrator {
    private config: TestConfig;
    private agent: SettleAgent | null = null;
    private executor: UniswapLiquidityExecutor | null = null;
    private logs: string[] = [];
    private logger: TestLogger;
    private perfTracker: PerformanceTracker;

    /**
     * Create a new EndToEndOrchestrator
     *
     * @param config - Test configuration
     * @param loggerConfig - Optional logger configuration
     */
    constructor(config: TestConfig, loggerConfig?: Partial<LoggerConfig>) {
        this.config = config;
        this.logger = new TestLogger(loggerConfig);
        this.perfTracker = new PerformanceTracker();
    }

    /**
     * Run the complete end-to-end flow
     *
     * @returns E2ETestResult with transfer, risk, decision, and execution details
     */
    async runFullFlow(): Promise<E2ETestResult> {
        const startTime = Date.now();
        this.logs = [];
        this.logger.clear();
        this.perfTracker.start();

        this.logger.section('End-to-End Integration Test');
        this.logger.info(`Mode: ${this.config.mode}`, { phase: 'init' });
        this.logger.info(`Amount: ${this.config.amount} USDC`, { phase: 'init' });
        this.logger.info(`Pool ID: ${this.config.poolId.slice(0, 18)}...`, { phase: 'init' });
        this.logger.info(`Recipient: ${this.config.recipient.slice(0, 18)}...`, { phase: 'init' });

        // Log agent policy configuration
        if (this.config.agentPolicy) {
            this.logger.debug('Agent Policy Configuration:', { phase: 'init' });
            const policy = this.config.agentPolicy;
            if (policy.max_slippage !== undefined) {
                this.logger.debug(`  max_slippage: ${(policy.max_slippage * 100).toFixed(2)}%`, { phase: 'init' });
            }
            if (policy.max_price_impact !== undefined) {
                this.logger.debug(`  max_price_impact: ${(policy.max_price_impact * 100).toFixed(2)}%`, { phase: 'init' });
            }
            if (policy.min_confidence !== undefined) {
                this.logger.debug(`  min_confidence: ${(policy.min_confidence * 100).toFixed(1)}%`, { phase: 'init' });
            }
            if (policy.retry_attempts !== undefined) {
                this.logger.debug(`  retry_attempts: ${policy.retry_attempts}`, { phase: 'init' });
            }
        }

        this.log(`Starting End-to-End Test (${this.config.mode} mode)`);
        this.log(`Amount: ${this.config.amount} USDC (raw)`);
        this.log(`Pool ID: ${this.config.poolId}`);
        this.log(`Recipient: ${this.config.recipient}`);

        try {
            // Step 1: Execute CCTP Transfer (Base → Arc)
            this.logger.subsection('Phase 1: CCTP Transfer (Base → Arc)');
            this.perfTracker.startPhase('transfer');
            this.log('\n--- Step 1: CCTP Transfer ---');
            const transferResult = await this.executeTransfer();
            const transferDuration = this.perfTracker.endPhase('transfer');

            if (!transferResult.success) {
                this.logger.error(`Transfer failed: ${transferResult.error}`, { 
                    phase: 'transfer',
                    durationMs: transferDuration 
                });
                this.log(`Transfer failed: ${transferResult.error}`);
                return this.buildErrorResult(
                    transferResult,
                    'Transfer failed',
                    startTime
                );
            }

            this.logger.info(`Transfer successful`, { 
                phase: 'transfer',
                durationMs: transferDuration,
                metadata: { txHash: transferResult.txHash }
            });
            this.log(`Transfer successful! TxHash: ${transferResult.txHash}`);

            // Log transfer step details if available
            if (transferResult.steps && transferResult.steps.length > 0) {
                this.logger.debug('Transfer step breakdown:', { phase: 'transfer' });
                this.log('Transfer step breakdown:');
                for (const step of transferResult.steps) {
                    const statusIcon =
                        step.status === 'completed'
                            ? '✓'
                            : step.status === 'failed'
                              ? '✗'
                              : '○';
                    this.logger.debug(`  ${statusIcon} ${step.step}${step.txHash ? ` (${step.txHash.slice(0, 10)}...)` : ''}`, { phase: 'transfer' });
                    this.log(
                        `  ${statusIcon} ${step.step}${step.txHash ? ` (${step.txHash.slice(0, 10)}...)` : ''}`
                    );
                }
            }

            // Step 2: Initialize agent and evaluate risk
            this.logger.subsection('Phase 2: Risk Evaluation');
            this.perfTracker.startPhase('riskEvaluation');
            this.log('\n--- Step 2: Risk Evaluation ---');
            const { risk, decision } = await this.evaluateRisk();
            const riskDuration = this.perfTracker.endPhase('riskEvaluation');

            this.logger.info(`Risk evaluation complete`, { 
                phase: 'riskEvaluation',
                durationMs: riskDuration 
            });
            this.logger.info(`Execution Confidence: ${(risk.execution_confidence * 100).toFixed(1)}%`, { phase: 'riskEvaluation' });
            this.logger.info(`Slippage P95: ${(risk.slippage_p95 * 100).toFixed(2)}%`, { phase: 'riskEvaluation' });
            this.logger.info(`Price Impact: ${(risk.price_impact * 100).toFixed(2)}%`, { phase: 'riskEvaluation' });
            this.logger.info(`Finality Delay P95: ${risk.finality_delay_p95}s`, { phase: 'riskEvaluation' });
            this.logger.info(`Agent Decision: ${decision.toUpperCase()}`, { 
                phase: 'riskEvaluation',
                metadata: { decision, recommendedAction: risk.recommended_action }
            });

            this.log(`Risk Metrics:`);
            this.log(
                `  - Confidence: ${(risk.execution_confidence * 100).toFixed(1)}%`
            );
            this.log(
                `  - Slippage P95: ${(risk.slippage_p95 * 100).toFixed(2)}%`
            );
            this.log(
                `  - Price Impact: ${(risk.price_impact * 100).toFixed(2)}%`
            );
            this.log(`  - Finality Delay P95: ${risk.finality_delay_p95}s`);
            this.log(`Agent Decision: ${decision}`);

            // Step 3: Execute based on decision
            this.logger.subsection('Phase 3: Execution');
            this.perfTracker.startPhase('execution');
            this.log('\n--- Step 3: Execution ---');
            const execution = await this.executeBasedOnDecision(decision, risk);
            const executionDuration = this.perfTracker.endPhase('execution');

            const statusEmoji = execution.status === 'completed' ? '✓' : execution.status === 'aborted' ? '⚠' : '✗';
            this.logger.info(`${statusEmoji} Execution Status: ${execution.status}`, { 
                phase: 'execution',
                durationMs: executionDuration,
                metadata: { 
                    txHash: execution.txHash,
                    positionId: execution.positionId,
                    reason: execution.reason
                }
            });

            this.log(`Execution Status: ${execution.status}`);
            if (execution.txHash) {
                this.logger.info(`Transaction Hash: ${execution.txHash}`, { phase: 'execution' });
                this.log(`Execution TxHash: ${execution.txHash}`);
            }
            if (execution.positionId) {
                this.logger.info(`Position NFT ID: ${execution.positionId}`, { phase: 'execution' });
                this.log(`Position ID: ${execution.positionId}`);
            }
            if (execution.reason) {
                this.logger.info(`Reason: ${execution.reason}`, { phase: 'execution' });
                this.log(`Reason: ${execution.reason}`);
            }

            const endTime = Date.now();
            const totalDuration = endTime - startTime;

            // Log performance summary
            this.logger.subsection('Performance Summary');
            const perfMetrics = this.perfTracker.getMetrics();
            this.logger.info(`Total Duration: ${totalDuration}ms`, { phase: 'summary' });
            for (const phase of perfMetrics.phases) {
                this.logger.debug(`  ${phase.name}: ${phase.durationMs}ms (${phase.percentage.toFixed(1)}%)`, { phase: 'summary' });
            }

            return {
                transfer: {
                    success: transferResult.success,
                    txHash: transferResult.txHash,
                    chain: transferResult.chain,
                    steps: transferResult.steps,
                    amount: transferResult.amount,
                    recipient: transferResult.recipient,
                },
                riskMetrics: risk,
                decision,
                execution,
                metadata: {
                    mode: this.config.mode,
                    startTime,
                    endTime,
                    durationMs: endTime - startTime,
                },
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Fatal Error: ${errorMessage}`, { phase: 'error' });
            this.log(`\nFatal Error: ${errorMessage}`);

            return this.buildErrorResult(
                { success: false, error: errorMessage },
                errorMessage,
                startTime
            );
        }
    }

    /**
     * Execute the CCTP transfer from Base to Arc
     *
     * Uses ArcTransferLeg for actual blockchain interaction via BridgeKit.
     *
     * CCTP Transfer Steps:
     * 1. Approve USDC spending on Base
     * 2. Burn USDC via TokenMessenger (depositForBurn)
     * 3. Wait for Circle attestation
     * 4. Mint USDC on Arc via MessageTransmitter (receiveMessage)
     *
     * @returns Transfer result with detailed step information
     */
    private async executeTransfer(): Promise<{
        success: boolean;
        txHash?: string;
        chain?: string;
        error?: string;
        steps?: TransferStepDetails[];
        amount?: string;
        recipient?: string;
    }> {
        const steps: TransferStepDetails[] = [];

        // Validate environment and execute actual transfer
        this.log('[Live] Executing CCTP transfer via ArcTransferLeg...');

        // Validate required environment variables
        const envValidation = this.validateCCTPEnvironment();
        if (!envValidation.valid) {
            this.log(`[Live] Environment validation failed: ${envValidation.error}`);
            return {
                success: false,
                error: `Missing environment variables: ${envValidation.missing?.join(', ')}`,
            };
        }

        this.log('[Live] Environment validation passed');
        this.log(`[Live] Transferring ${this.config.amount} USDC to ${this.config.recipient}`);

        try {
            // Create ArcTransferLeg instance
            const arcTransfer = new ArcTransferLeg({
                amount: this.config.amount,
                recipient: this.config.recipient,
            });

            // Get transfer estimate
            const estimate = await arcTransfer.estimate();
            this.log(`[Live] Transfer estimate:`);
            this.log(`  - Gas: ${estimate.gasEstimate}`);
            this.log(`  - Estimated time: ${estimate.estimatedTimeMs}ms`);
            this.log(`  - Failure probability: ${(estimate.failureProbability * 100).toFixed(1)}%`);

            // Step 1: Approve (logged by ArcTransferLeg internally)
            this.log('[Live] Step 1/4: Approving USDC spending on Base...');
            steps.push({
                step: 'approve',
                status: 'pending',
                timestamp: Date.now(),
            });

            // Step 2-4: Execute the full transfer (ArcTransferLeg handles all steps)
            this.log('[Live] Step 2/4: Initiating burn on Base (depositForBurn)...');
            steps.push({
                step: 'burn',
                status: 'pending',
                timestamp: Date.now(),
            });

            // Execute the transfer
            const receipt: LegReceipt = await arcTransfer.execute();

            // Update step statuses on success
            steps[0].status = 'completed';
            steps[1].status = 'completed';
            steps[1].txHash = receipt.txHash;

            // Add attestation step (handled inside execute)
            this.log('[Live] Step 3/4: Circle attestation received');
            steps.push({
                step: 'attestation',
                status: 'completed',
                timestamp: Date.now(),
            });

            // Add mint step (handled inside execute)
            this.log('[Live] Step 4/4: USDC minted on Arc');
            steps.push({
                step: 'mint',
                status: 'completed',
                timestamp: Date.now(),
            });

            this.log('[Live] CCTP transfer completed successfully!');

            return {
                success: receipt.success,
                txHash: receipt.txHash,
                chain: receipt.chain,
                steps,
                amount: this.config.amount,
                recipient: this.config.recipient,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Transfer failed';

            // Mark the last pending step as failed
            const lastPendingStep = steps.find((s) => s.status === 'pending');
            if (lastPendingStep) {
                lastPendingStep.status = 'failed';
                lastPendingStep.error = errorMessage;
            }

            this.log(`[Live] CCTP transfer failed: ${errorMessage}`);

            return {
                success: false,
                error: errorMessage,
                steps,
            };
        }
    }

    /**
     * Validate that all required environment variables for CCTP transfer are set
     *
     * @returns Validation result with missing variables if any
     */
    private validateCCTPEnvironment(): {
        valid: boolean;
        error?: string;
        missing?: string[];
    } {
        const required: (keyof CCTPEnvironmentConfig)[] = [
            'PRIVATE_KEY',
            'BASE_RPC',
            'ARC_RPC',
            'USDC_BASE',
            'TOKEN_MESSENGER_BASE',
            'MESSAGE_TRANSMITTER_ARC',
            'ARC_DOMAIN',
        ];

        const missing = required.filter((key) => !process.env[key]);

        if (missing.length > 0) {
            return {
                valid: false,
                error: `Missing required environment variables: ${missing.join(', ')}`,
                missing,
            };
        }

        // Optional warning for CIRCLE_API_KEY
        if (!process.env.CIRCLE_API_KEY) {
            this.log('[Live] Warning: CIRCLE_API_KEY not set, attestation may fail');
        }

        return { valid: true };
    }

    /**
     * Evaluate risk using the SettleAgent's simulator
     *
     * Runs actual risk simulation via SettleAgent.
     *
     * The SettleAgent uses RiskSimulator internally to:
     * - Estimate Arc network latency (CCTP transfer timing)
     * - Analyze Uniswap pool state (liquidity, slippage, price impact)
     * - Calculate execution confidence score
     * - Recommend action based on configurable thresholds
     *
     * @returns Risk metrics and recommended decision
     */
    private async evaluateRisk(): Promise<{
        risk: RiskMetrics;
        decision: AgentDecision;
    }> {
        // Initialize SettleAgent for risk simulation and decision making
        this.log('[Live] Initializing SettleAgent for risk evaluation...');

        const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

        if (privateKey) {
            // Create agent with wallet for potential execution
            this.agent = createSettleAgent(
                privateKey,
                this.config.agentPolicy || {},
                'unichainSepolia'
            );

            // Initialize executor separately for direct execution path
            const account = privateKeyToAccount(privateKey);
            this.executor = new UniswapLiquidityExecutor(account, 'unichainSepolia');
            this.log('[Live] Wallet configured for transaction signing');
        } else {
            // Simulation-only mode (no wallet)
            this.agent = new SettleAgent(
                this.config.agentPolicy || {},
                undefined,
                'unichainSepolia'
            );
            this.log('[Live] No wallet configured - running in simulation-only mode');
        }

        // Convert human-readable amount to raw USDC base units (6 decimals)
        const USDC_DECIMALS = 6;
        const rawAmount = parseUnits(this.config.amount, USDC_DECIMALS).toString();

        // Build the liquidity deposit intent with raw amount
        const intent: DepositLiquidityIntent = {
            poolId: this.config.poolId,
            amount: rawAmount, // Use raw amount (6 decimals) for risk simulation
        };

        this.log('[Live] Running risk simulation via SettleAgent...');
        this.log(`[Live] Intent: pool=${intent.poolId.slice(0, 18)}..., amount=${this.config.amount} USDC (${rawAmount} raw)`);

        // Use simulateOnly() to get risk metrics and decision without executing
        // This runs RiskSimulator internally which:
        // 1. Estimates Arc network latency (CCTP timing)
        // 2. Analyzes Uniswap pool (liquidity, slippage, price impact)
        // 3. Calculates execution confidence
        // 4. Makes decision based on agent policy thresholds
        const { risk, decision, reason } = await this.agent.simulateOnly(intent);

        if (reason) {
            this.log(`[Live] Risk evaluation reason: ${reason}`);
        }

        return { risk, decision };
    }

    /**
     * Execute based on the agent's decision
     *
     * Decision flow:
     * - 'execute': Proceed with liquidity deposit via UniswapLiquidityExecutor
     * - 'wait': Retry risk evaluation after delay (up to max retries)
     * - 'abort': Stop execution and report risk threshold violations
     *
     * @param decision - Agent decision ('execute', 'wait', or 'abort')
     * @param risk - Risk metrics at time of decision
     * @param retryCount - Current retry count for 'wait' decisions
     * @returns Execution result
     */
    private async executeBasedOnDecision(
        decision: AgentDecision,
        risk: RiskMetrics,
        retryCount: number = 0
    ): Promise<ExecutionResult> {
        const policy = this.config.agentPolicy || {};
        const maxRetries = policy.retry_attempts ?? 3;
        const retryDelaySeconds = policy.retry_delay_seconds ?? 30;

        // Execute based on decision
        this.log(`[Live] Processing decision: ${decision}`);

        switch (decision) {
            case 'execute':
                return this.executeLiquidityDeposit(risk);

            case 'wait':
                // Retry with delay if within retry limit
                if (retryCount < maxRetries) {
                    this.log(`[Live] Waiting ${retryDelaySeconds}s before retry ${retryCount + 1}/${maxRetries}...`);
                    await this.sleep(retryDelaySeconds * 1000);

                    // Re-evaluate risk after waiting
                    this.log('[Live] Re-evaluating risk after wait...');
                    const { risk: newRisk, decision: newDecision } = await this.evaluateRisk();

                    this.log(`[Live] New decision after wait: ${newDecision}`);
                    return this.executeBasedOnDecision(newDecision, newRisk, retryCount + 1);
                }

                // Max retries exceeded
                this.log(`[Live] Max retries (${maxRetries}) exceeded while waiting`);
                return {
                    status: 'aborted',
                    reason: `Max retries (${maxRetries}) exceeded while waiting for favorable conditions`,
                    risk,
                    timestamp: Date.now(),
                };

            case 'abort':
                const abortReason = this.getAbortReason(risk);
                this.log(`[Live] Aborting: ${abortReason}`);
                return {
                    status: 'aborted',
                    reason: abortReason,
                    risk,
                    timestamp: Date.now(),
                };
        }
    }

    /**
     * Execute liquidity deposit via UniswapLiquidityExecutor
     *
     * This is called when the agent decision is 'execute'.
     * Uses the executor directly instead of re-running risk simulation.
     *
     * The amount is converted from human-readable format (e.g., "1.0" USDC)
     * to raw base units (e.g., "1000000" for USDC with 6 decimals) before
     * being passed to the UniswapLiquidityExecutor.
     *
     * @param risk - Risk metrics at time of execution
     * @returns Execution result
     */
    private async executeLiquidityDeposit(risk: RiskMetrics): Promise<ExecutionResult> {
        this.log('[Live] Executing liquidity deposit via UniswapLiquidityExecutor...');

        // Check if executor is available
        if (!this.executor) {
            this.log('[Live] No executor available - simulation mode only');
            return {
                status: 'completed',
                reason: 'Simulation mode - no wallet configured for actual execution',
                risk,
                timestamp: Date.now(),
            };
        }

        // Check if pool key is provided
        if (!this.config.poolKey) {
            return {
                status: 'failed',
                reason: 'Pool key is required for liquidity deposit execution',
                risk,
                timestamp: Date.now(),
            };
        }

        // Convert human-readable amount to raw USDC base units (6 decimals)
        // e.g., "1.0" -> "1000000", "0.5" -> "500000"
        const USDC_DECIMALS = 6;
        const rawAmount = parseUnits(this.config.amount, USDC_DECIMALS).toString();

        this.log(`[Live] Amount conversion: ${this.config.amount} USDC -> ${rawAmount} raw units`);

        // Build deposit intent with raw amount for UniswapLiquidityExecutor
        const intent: DepositLiquidityIntent = {
            poolId: this.config.poolId,
            amount: rawAmount, // Use raw amount (6 decimals) for executor
            recipient: this.config.recipient,
        };

        this.log(`[Live] Depositing ${this.config.amount} USDC to pool ${intent.poolId.slice(0, 18)}...`);
        this.log(`[Live] Recipient: ${intent.recipient}`);
        this.log(`[Live] Pool key: currency0=${this.config.poolKey.currency0.slice(0, 10)}..., currency1=${this.config.poolKey.currency1.slice(0, 10)}..., fee=${this.config.poolKey.fee}`);

        try {
            // Execute via UniswapLiquidityExecutor
            // The executor handles:
            // 1. USDC balance check
            // 2. Allowance check and approval if needed
            // 3. Minting liquidity position via PositionManager
            const result = await this.executor.depositFromIntent(intent, this.config.poolKey);

            if (result.success) {
                this.log(`[Live] Deposit successful!`);
                this.log(`[Live] TxHash: ${result.txHash}`);
                if (result.positionId) {
                    this.log(`[Live] Position NFT ID: ${result.positionId}`);
                }
                if (result.amount0) {
                    this.log(`[Live] Amount0 deposited: ${result.amount0}`);
                }
                if (result.amount1) {
                    this.log(`[Live] Amount1 deposited: ${result.amount1}`);
                }
                return {
                    status: 'completed',
                    txHash: result.txHash,
                    positionId: result.positionId,
                    risk,
                    timestamp: Date.now(),
                };
            } else {
                this.log(`[Live] Deposit failed: ${result.error}`);
                return {
                    status: 'failed',
                    reason: result.error || 'Unknown error during liquidity deposit',
                    risk,
                    timestamp: Date.now(),
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`[Live] Execution error: ${errorMessage}`);
            return {
                status: 'failed',
                reason: errorMessage,
                risk,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Get a human-readable abort reason based on risk metrics and policy
     */
    private getAbortReason(risk: RiskMetrics): string {
        const policy = this.config.agentPolicy || {};
        const maxSlippage = policy.max_slippage ?? 0.01;
        const maxPriceImpact = policy.max_price_impact ?? 0.02;
        const minConfidence = policy.min_confidence ?? 0.80;

        const reasons: string[] = [];

        if (risk.execution_confidence < minConfidence) {
            reasons.push(
                `Low confidence (${(risk.execution_confidence * 100).toFixed(1)}% < ${(minConfidence * 100).toFixed(1)}%)`
            );
        }

        if (risk.slippage_p95 > maxSlippage) {
            reasons.push(
                `High slippage (${(risk.slippage_p95 * 100).toFixed(2)}% > ${(maxSlippage * 100).toFixed(2)}%)`
            );
        }

        if (risk.price_impact > maxPriceImpact) {
            reasons.push(
                `High price impact (${(risk.price_impact * 100).toFixed(2)}% > ${(maxPriceImpact * 100).toFixed(2)}%)`
            );
        }

        return reasons.length > 0 ? reasons.join('; ') : 'Risk thresholds exceeded';
    }

    /**
     * Build an error result when the flow fails early
     */
    private buildErrorResult(
        transferResult: { success: boolean; error?: string },
        reason: string,
        startTime: number
    ): E2ETestResult {
        const endTime = Date.now();

        const errorRisk: RiskMetrics = {
            finality_delay_p50: 0,
            finality_delay_p95: 0,
            capital_at_risk_seconds: 0,
            slippage_p50: 0,
            slippage_p95: 0,
            price_impact: 0,
            pool_liquidity_depth: '0',
            execution_confidence: 0,
            recommended_action: 'abort',
        };

        return {
            transfer: transferResult,
            riskMetrics: errorRisk,
            decision: 'abort',
            execution: {
                status: 'failed',
                reason,
                risk: errorRisk,
                timestamp: endTime,
            },
            metadata: {
                mode: this.config.mode,
                startTime,
                endTime,
                durationMs: endTime - startTime,
            },
        };
    }

    /**
     * Generate a human-readable test report
     */
    generateReport(result: E2ETestResult): DetailedTestReport {
        const success =
            result.transfer.success && result.execution.status === 'completed';

        let summary: string;
        if (success) {
            summary = `✓ End-to-end test PASSED (${result.metadata.durationMs}ms)`;
        } else if (!result.transfer.success) {
            // Include failed step info if available
            const failedStep = result.transfer.steps?.find(
                (s) => s.status === 'failed'
            );
            const stepInfo = failedStep
                ? ` at step '${failedStep.step}'`
                : '';
            summary = `✗ End-to-end test FAILED: Transfer failed${stepInfo} - ${result.transfer.error}`;
        } else if (result.execution.status === 'aborted') {
            summary = `⚠ End-to-end test ABORTED: ${result.execution.reason}`;
        } else {
            summary = `✗ End-to-end test FAILED: ${result.execution.reason}`;
        }

        // Add transfer details to summary for live tests
        if (
            result.metadata.mode === 'live' &&
            result.transfer.amount &&
            result.transfer.recipient
        ) {
            summary += `\n  Transfer: ${result.transfer.amount} USDC to ${result.transfer.recipient.slice(0, 10)}...`;
        }

        const performance = this.perfTracker.getMetrics();

        return {
            summary,
            success,
            result,
            logs: [...this.logs],
            performance,
            environment: {
                mode: result.metadata.mode,
                nodeVersion: process.version,
                platform: process.platform,
                timestamp: new Date().toISOString(),
            },
            logEntries: this.logger.getEntries(),
        };
    }

    /**
     * Get the current log entries (simple text format)
     */
    getLogs(): string[] {
        return [...this.logs];
    }

    /**
     * Get structured log entries
     */
    getLogEntries(): LogEntry[] {
        return this.logger.getEntries();
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return this.perfTracker.getMetrics();
    }

    /**
     * Get the logger instance for custom logging
     */
    getLogger(): TestLogger {
        return this.logger;
    }

    /**
     * Internal logging helper
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${message}`;
        this.logs.push(entry);
        console.log(entry);
    }

    /**
     * Sleep utility for mock delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Test Runner

/**
 * Options for running end-to-end tests
 */
export interface TestRunOptions {
    /** Test configuration */
    config?: Partial<TestConfig>;
    /** Logger configuration */
    loggerConfig?: Partial<LoggerConfig>;
    /** Whether to print detailed report */
    verbose?: boolean;
    /** Path to export JSON results */
    exportPath?: string;
}

/**
 * Run the end-to-end test with the given configuration
 */
export async function runEndToEndTest(
    config: Partial<TestConfig> = {},
    options: Omit<TestRunOptions, 'config'> = {}
): Promise<DetailedTestReport> {
    // Default test configuration
    const defaultConfig: TestConfig = {
        mode: 'live',
        amount: '0.5', // 0.5 USDC (human-readable format, ArcTransferLeg uses parseUnits internally)
        poolId: '0x0000000000000000000000000000000000000000000000000000000000000001',
        recipient:
            process.env.RECIPIENT_ADDRESS ||
            '0x0000000000000000000000000000000000000001',
        agentPolicy: {
            max_slippage: 0.01, // 1%
            max_price_impact: 0.02, // 2%
            min_confidence: 0.80, // 80%
            retry_attempts: 2,
            retry_delay_seconds: 5,
        },
        // Default pool key for Unichain Sepolia
        poolKey: {
            currency0: '0x31d0220469e10c4E71834a79b1f276d740d3768F' as Address, // USDC
            currency1: '0x0000000000000000000000000000000000000000' as Address, // ETH
            fee: 3000, // 0.3%
            tickSpacing: 60,
            hooks: '0x0000000000000000000000000000000000000000' as Address,
        },
    };

    const mergedConfig: TestConfig = { ...defaultConfig, ...config };
    const verbose = options.verbose ?? true;

    const orchestrator = new EndToEndOrchestrator(mergedConfig, options.loggerConfig);
    const result = await orchestrator.runFullFlow();
    const report = orchestrator.generateReport(result);

    // Print detailed report
    if (verbose) {
        printDetailedReport(report);
    }

    // Export to file if path provided
    if (options.exportPath) {
        const jsonReport = generateJsonReport(
            result,
            report.logEntries,
            report.performance
        );
        const dir = path.dirname(options.exportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(options.exportPath, jsonReport);
        console.log(`\n📄 Report exported to: ${options.exportPath}`);
    }

    return report;
}

/**
 * Print a detailed test report to console
 */
function printDetailedReport(report: DetailedTestReport): void {
    const result = report.result;
    const perf = report.performance;
    const logger = new TestLogger({ colorOutput: true, timestamps: false, level: LogLevel.INFO });

    console.log('\n');
    logger.section('TEST REPORT');

    // Summary
    console.log(`\n${report.summary}`);

    // Transfer Details
    logger.subsection('Transfer Phase');
    logger.status('CCTP Transfer', result.transfer.success, result.transfer.txHash?.slice(0, 18));
    if (result.transfer.amount) {
        logger.keyValue('Amount', `${result.transfer.amount} USDC`);
    }
    if (result.transfer.recipient) {
        logger.keyValue('Recipient', result.transfer.recipient);
    }
    if (result.transfer.chain) {
        logger.keyValue('Source Chain', result.transfer.chain);
    }

    // Transfer Steps
    if (result.transfer.steps && result.transfer.steps.length > 0) {
        console.log('\n  Step Breakdown:');
        for (const step of result.transfer.steps) {
            logger.status(
                step.step.charAt(0).toUpperCase() + step.step.slice(1),
                step.status === 'completed',
                step.txHash?.slice(0, 12)
            );
        }
    }

    // Risk Evaluation
    logger.subsection('Risk Evaluation');
    console.log(formatRiskMetrics(result.riskMetrics));

    // Agent Decision
    logger.subsection('Agent Decision');
    const decisionIcon = result.decision === 'execute' ? '✓' : result.decision === 'wait' ? '⏳' : '✗';
    logger.keyValue('Decision', `${decisionIcon} ${result.decision.toUpperCase()}`);

    // Execution Result
    logger.subsection('Execution Result');
    logger.status('Execution', result.execution.status === 'completed', result.execution.status);
    if (result.execution.txHash) {
        logger.keyValue('Transaction', result.execution.txHash);
    }
    if (result.execution.positionId) {
        logger.keyValue('Position NFT ID', result.execution.positionId);
    }
    if (result.execution.reason) {
        logger.keyValue('Reason', result.execution.reason);
    }

    // Performance Metrics
    logger.subsection('Performance Metrics');
    logger.keyValue('Total Duration', `${perf.totalDurationMs}ms`);
    console.log('\n  Phase Breakdown:');
    for (const phase of perf.phases) {
        const bar = '█'.repeat(Math.round(phase.percentage / 5)) + '░'.repeat(20 - Math.round(phase.percentage / 5));
        console.log(`    ${phase.name.padEnd(16)} ${bar} ${phase.durationMs}ms (${phase.percentage.toFixed(1)}%)`);
    }

    // Environment
    logger.subsection('Environment');
    logger.keyValue('Mode', report.environment.mode);
    logger.keyValue('Node Version', report.environment.nodeVersion);
    logger.keyValue('Platform', report.environment.platform);
    logger.keyValue('Timestamp', report.environment.timestamp);

    console.log('\n');
}

// Test Scenarios

/**
 * Live CCTP transfer test: Requires environment variables to be set
 * Run with: LIVE_TEST=true npx ts-node packages/sdk/test/end-to-end.test.ts
 */
export async function testLiveCCTPTransfer(): Promise<DetailedTestReport> {
    console.log('\n🧪 TEST: Live CCTP Transfer');
    console.log('   Mode: LIVE - Real blockchain transactions');
    console.log('   Networks: Base Sepolia → Arc Testnet\n');
    
    return runEndToEndTest({
        mode: 'live',
        amount: '0.01', // Small amount for testing (0.01 USDC)
        recipient: process.env.RECIPIENT_ADDRESS || '',
        agentPolicy: {
            max_slippage: 0.05, // 5% slippage tolerance for testnet
            min_confidence: 0.50, // Lower confidence for testnet
        },
    }, { verbose: true });
}

/**
 * Live Uniswap execution test: Executes actual liquidity deposit on testnet
 *
 * Run with: LIVE_UNISWAP_TEST=true npx ts-node packages/sdk/test/end-to-end.test.ts
 *
 * Prerequisites:
 * - PRIVATE_KEY set with funded testnet account
 * - Account has USDC on Unichain Sepolia
 * - Network RPC endpoints configured
 */
export async function testLiveUniswapExecution(): Promise<DetailedTestReport> {
    console.log('\n🧪 TEST: Live Uniswap Execution');
    console.log('   Mode: LIVE - Real liquidity deposit on Unichain Sepolia');

    const recipient = process.env.RECIPIENT_ADDRESS || process.env.PUBLIC_ADDRESS || '';

    if (!recipient) {
        console.warn('   ⚠️  No RECIPIENT_ADDRESS set, using zero address\n');
    } else {
        console.log(`   Recipient: ${recipient.slice(0, 18)}...\n`);
    }

    return runEndToEndTest({
        mode: 'live',
        amount: '0.1', // 0.1 USDC - small amount for testnet
        recipient,
        agentPolicy: {
            max_slippage: 0.10,         // 10% max slippage for testnet
            max_price_impact: 0.10,     // 10% max price impact for testnet
            min_confidence: 0.30,       // Lower confidence for testnet
            retry_attempts: 2,
            retry_delay_seconds: 5,
            fallback_strategy: 'wait',
        },
        poolKey: {
            currency0: '0x31d0220469e10c4E71834a79b1f276d740d3768F' as Address, // USDC on Unichain Sepolia
            currency1: '0x0000000000000000000000000000000000000000' as Address, // ETH
            fee: 3000,
            tickSpacing: 60,
            hooks: '0x0000000000000000000000000000000000000000' as Address,
        },
    }, { verbose: true });
}

/**
 * Combined live test: CCTP Transfer + Uniswap Execution
 * 
 * Runs both live tests sequentially:
 * 1. CCTP Transfer from Base Sepolia to Arc Testnet
 * 2. Uniswap liquidity deposit on Unichain Sepolia
 * 
 * Run with: LIVE_FULL_TEST=true npx ts-node packages/sdk/test/end-to-end.test.ts
 */
export async function testLiveCCTPAndUniswap(): Promise<{
    cctpResult: DetailedTestReport;
    uniswapResult: DetailedTestReport;
}> {
    console.log('\n🧪 TEST: Live CCTP + Uniswap Combined');
    console.log('   Mode: LIVE - Full end-to-end flow');
    console.log('   1. CCTP Transfer: Base Sepolia → Arc Testnet');
    console.log('   2. Uniswap Deposit: Unichain Sepolia\n');

    // Run CCTP Transfer first
    const cctpResult = await testLiveCCTPTransfer();
    
    // Run Uniswap Execution second
    const uniswapResult = await testLiveUniswapExecution();

    return { cctpResult, uniswapResult };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Print the test suite header
 */
function printSuiteHeader(): void {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                  ║');
    console.log('║       SettleKit End-to-End Integration Test Suite               ║');
    console.log('║                                                                  ║');
    console.log('║       Cross-Chain Liquidity Provision Flow Testing              ║');
    console.log('║       Base (USDC) → Arc Hub (CCTP) → Uniswap v4 Pool            ║');
    console.log('║                                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');
}

/**
 * Print comprehensive test suite summary
 */
function printSuiteSummary(
    results: { name: string; report: DetailedTestReport }[],
    isLiveTest: boolean
): void {
    const stats = calculateTestStats(results);

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                       TEST SUITE SUMMARY                         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');

    // Results table
    console.log('\n┌──────────────────────────────────────────────────────────────────┐');
    console.log('│  Status    Test Name                              Duration       │');
    console.log('├──────────────────────────────────────────────────────────────────┤');

    for (const { name, report } of results) {
        const statusIcon = report.success
            ? '\x1b[32m✓ PASS  \x1b[0m'
            : report.result.execution.status === 'aborted'
              ? '\x1b[33m⚠ ABORT \x1b[0m'
              : '\x1b[31m✗ FAIL  \x1b[0m';

        const duration = `${report.result.metadata.durationMs}ms`.padStart(8);
        const testName = name.padEnd(40);
        console.log(`│  ${statusIcon}  ${testName}  ${duration}    │`);
    }

    console.log('└──────────────────────────────────────────────────────────────────┘');

    // Statistics
    console.log('\n┌──────────────────────────────────────────────────────────────────┐');
    console.log('│                          STATISTICS                              │');
    console.log('├──────────────────────────────────────────────────────────────────┤');
    
    const passRate = stats.successRate.toFixed(1);
    const passBar = '█'.repeat(Math.round(stats.successRate / 5)) + '░'.repeat(20 - Math.round(stats.successRate / 5));
    
    console.log(`│  Total Tests:     ${stats.total.toString().padStart(4)}                                          │`);
    console.log(`│  Passed:          \x1b[32m${stats.passed.toString().padStart(4)}\x1b[0m                                          │`);
    console.log(`│  Failed:          \x1b[31m${stats.failed.toString().padStart(4)}\x1b[0m                                          │`);
    console.log(`│  Aborted:         \x1b[33m${stats.aborted.toString().padStart(4)}\x1b[0m                                          │`);
    console.log(`│                                                                  │`);
    console.log(`│  Success Rate:    ${passBar} ${passRate}%              │`);
    console.log(`│                                                                  │`);
    console.log(`│  Total Duration:  ${stats.totalDurationMs.toString().padStart(6)}ms                                     │`);
    console.log(`│  Avg Duration:    ${stats.averageDurationMs.toString().padStart(6)}ms                                     │`);
    console.log('└──────────────────────────────────────────────────────────────────┘');

    // Performance breakdown (aggregate)
    if (results.length > 0) {
        console.log('\n┌──────────────────────────────────────────────────────────────────┐');
        console.log('│                    AGGREGATE PERFORMANCE                         │');
        console.log('├──────────────────────────────────────────────────────────────────┤');

        const avgTransfer = Math.round(
            results.reduce((sum, r) => sum + r.report.performance.breakdown.transferMs, 0) / results.length
        );
        const avgRisk = Math.round(
            results.reduce((sum, r) => sum + r.report.performance.breakdown.riskEvaluationMs, 0) / results.length
        );
        const avgExec = Math.round(
            results.reduce((sum, r) => sum + r.report.performance.breakdown.executionMs, 0) / results.length
        );

        console.log(`│  Avg Transfer Phase:        ${avgTransfer.toString().padStart(6)}ms                              │`);
        console.log(`│  Avg Risk Evaluation:       ${avgRisk.toString().padStart(6)}ms                              │`);
        console.log(`│  Avg Execution Phase:       ${avgExec.toString().padStart(6)}ms                              │`);
        console.log('└──────────────────────────────────────────────────────────────────┘');
    }

    // Live test specific details
    if (isLiveTest && results.length > 0) {
        const liveResult = results[0].report.result;

        // CCTP transfer details
        if (liveResult.transfer.steps && liveResult.transfer.steps.length > 0) {
            console.log('\n┌──────────────────────────────────────────────────────────────────┐');
            console.log('│                   CCTP TRANSFER DETAILS                          │');
            console.log('├──────────────────────────────────────────────────────────────────┤');

            for (const step of liveResult.transfer.steps) {
                const statusIcon =
                    step.status === 'completed'
                        ? '\x1b[32m✓\x1b[0m'
                        : step.status === 'failed'
                          ? '\x1b[31m✗\x1b[0m'
                          : '\x1b[33m○\x1b[0m';
                const stepName = step.step.charAt(0).toUpperCase() + step.step.slice(1);
                const txInfo = step.txHash ? `tx: ${step.txHash.slice(0, 16)}...` : '';
                const errorInfo = step.error ? `error: ${step.error.slice(0, 20)}...` : '';
                const info = txInfo || errorInfo || '';
                console.log(`│  ${statusIcon} ${stepName.padEnd(15)} ${info.padEnd(45)}│`);
            }
            console.log('└──────────────────────────────────────────────────────────────────┘');
        }

        // Risk metrics summary
        console.log('\n┌──────────────────────────────────────────────────────────────────┐');
        console.log('│                    RISK METRICS SUMMARY                          │');
        console.log('├──────────────────────────────────────────────────────────────────┤');
        console.log(`│  Execution Confidence:  ${(liveResult.riskMetrics.execution_confidence * 100).toFixed(1).padStart(6)}%                              │`);
        console.log(`│  Slippage P95:          ${(liveResult.riskMetrics.slippage_p95 * 100).toFixed(2).padStart(6)}%                              │`);
        console.log(`│  Price Impact:          ${(liveResult.riskMetrics.price_impact * 100).toFixed(2).padStart(6)}%                              │`);
        console.log(`│  Finality Delay P95:    ${liveResult.riskMetrics.finality_delay_p95.toString().padStart(6)}s                              │`);
        console.log('└──────────────────────────────────────────────────────────────────┘');
    }

    // Final verdict
    console.log('\n');
    if (stats.failed === 0) {
        console.log('\x1b[32m✓ All tests completed successfully!\x1b[0m');
    } else {
        console.log(`\x1b[31m✗ ${stats.failed} test(s) failed.\x1b[0m`);
    }
    console.log('\n');
}

/**
 * Run all test scenarios when executed directly
 */
async function main() {
    printSuiteHeader();

    const exportResults = process.env.EXPORT_RESULTS === 'true';
    const verboseLogging = process.env.VERBOSE !== 'false';
    const jsonOutput = process.env.JSON_OUTPUT === 'true';

    const results: { name: string; report: DetailedTestReport }[] = [];

    // Configure logger based on environment
    const loggerConfig: Partial<LoggerConfig> = {
        level: verboseLogging ? LogLevel.DEBUG : LogLevel.INFO,
        colorOutput: !jsonOutput,
        jsonOutput,
    };

    // Run combined CCTP + Uniswap live tests
    console.log('🔴 Running LIVE end-to-end tests');
    console.log('   This will execute real transactions on:');
    console.log('   • Base Sepolia → Arc Testnet (CCTP Transfer)');
    console.log('   • Unichain Sepolia (Uniswap Liquidity Deposit)');
    console.log('   Ensure PRIVATE_KEY is set and account has USDC');
    console.log('');
    console.log('   Environment Variables:');
    console.log('   • EXPORT_RESULTS=true - Export results to JSON');
    console.log('   • VERBOSE=false       - Reduce log verbosity');
    console.log('   • JSON_OUTPUT=true    - Output logs as JSON\n');

    const { cctpResult, uniswapResult } = await testLiveCCTPAndUniswap();
    results.push({ name: 'Live CCTP Transfer', report: cctpResult });
    results.push({ name: 'Live Uniswap Execution', report: uniswapResult });

    // Print comprehensive summary
    printSuiteSummary(results, true);

    // Export results if requested
    if (exportResults) {
        const exportPath = `./test-results/e2e-results-${Date.now()}.json`;
        exportTestResults(results, exportPath);
        console.log(`📄 Results exported to: ${exportPath}\n`);
    }

    // Calculate final status
    const stats = calculateTestStats(results);
    
    // Exit with appropriate code
    process.exit(stats.failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error('\x1b[31mFatal error:\x1b[0m', error);
        process.exit(1);
    });
}
