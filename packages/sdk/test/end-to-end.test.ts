/**
 * End-to-End Integration Test for Cross-Chain Liquidity Provision
 *
 * Wire together all components for a complete cross-chain liquidity provision flow:
 * 1. ArcTransferLeg - CCTP transfer from Base to Arc
 * 2. SettleAgent - Risk evaluation and decision making
 * 3. UniswapLiquidityExecutor - Uniswap v4 liquidity deposit
 *
 * Flow: USDC on Base → Arc Hub (CCTP) → USDC on Arc/Unichain → SettleAgent → Uniswap Pool
 */

import 'dotenv/config';

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
import type { Address } from 'viem';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Test configuration for the end-to-end orchestrator
 */
export interface TestConfig {
    /** Mode: 'mock' uses simulated data, 'live' interacts with real testnets */
    mode: 'mock' | 'live';
    /** USDC amount to transfer/deposit (e.g., "1000000" = 1 USDC with 6 decimals) */
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
 * Result of the end-to-end test flow
 */
export interface E2ETestResult {
    /** Transfer phase result */
    transfer: {
        success: boolean;
        txHash?: string;
        chain?: string;
        error?: string;
    };
    /** Risk metrics from simulation */
    riskMetrics: RiskMetrics;
    /** Agent decision based on risk evaluation */
    decision: AgentDecision;
    /** Final execution result */
    execution: ExecutionResult;
    /** Test metadata */
    metadata: {
        mode: 'mock' | 'live';
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

// ============================================================================
// Mock Data for Testing
// ============================================================================

/**
 * Mock risk metrics for testing without blockchain interaction
 */
const MOCK_RISK_METRICS: RiskMetrics = {
    finality_delay_p50: 15,
    finality_delay_p95: 45,
    capital_at_risk_seconds: 60,
    slippage_p50: 0.002, // 0.2%
    slippage_p95: 0.005, // 0.5%
    price_impact: 0.003, // 0.3%
    pool_liquidity_depth: '10000000000', // $10,000 USDC
    execution_confidence: 0.95, // 95%
    recommended_action: 'execute',
};

/**
 * Mock execution result for simulation mode
 */
const MOCK_EXECUTION_RESULT: ExecutionResult = {
    status: 'completed',
    txHash: '0xmock_tx_hash_' + Date.now().toString(16),
    positionId: '12345',
    risk: MOCK_RISK_METRICS,
    timestamp: Date.now(),
};

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
    private logs: string[] = [];

    /**
     * Create a new EndToEndOrchestrator
     *
     * @param config - Test configuration
     */
    constructor(config: TestConfig) {
        this.config = config;
    }

    /**
     * Run the complete end-to-end flow
     *
     * @returns E2ETestResult with transfer, risk, decision, and execution details
     */
    async runFullFlow(): Promise<E2ETestResult> {
        const startTime = Date.now();
        this.logs = [];

        this.log(`Starting End-to-End Test (${this.config.mode} mode)`);
        this.log(`Amount: ${this.config.amount} USDC (raw)`);
        this.log(`Pool ID: ${this.config.poolId}`);
        this.log(`Recipient: ${this.config.recipient}`);

        try {
            // Step 1: Execute CCTP Transfer (Base → Arc)
            this.log('\n--- Step 1: CCTP Transfer ---');
            const transferResult = await this.executeTransfer();

            if (!transferResult.success) {
                this.log(`Transfer failed: ${transferResult.error}`);
                return this.buildErrorResult(
                    transferResult,
                    'Transfer failed',
                    startTime
                );
            }

            this.log(`Transfer successful! TxHash: ${transferResult.txHash}`);

            // Step 2: Initialize agent and evaluate risk
            this.log('\n--- Step 2: Risk Evaluation ---');
            const { risk, decision } = await this.evaluateRisk();

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
            this.log('\n--- Step 3: Execution ---');
            const execution = await this.executeBasedOnDecision(decision, risk);

            this.log(`Execution Status: ${execution.status}`);
            if (execution.txHash) {
                this.log(`Execution TxHash: ${execution.txHash}`);
            }
            if (execution.positionId) {
                this.log(`Position ID: ${execution.positionId}`);
            }
            if (execution.reason) {
                this.log(`Reason: ${execution.reason}`);
            }

            const endTime = Date.now();

            return {
                transfer: {
                    success: transferResult.success,
                    txHash: transferResult.txHash,
                    chain: transferResult.chain,
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
     * In mock mode, simulates a successful transfer.
     * In live mode, uses ArcTransferLeg for actual blockchain interaction.
     *
     * @returns LegReceipt-compatible result
     */
    private async executeTransfer(): Promise<{
        success: boolean;
        txHash?: string;
        chain?: string;
        error?: string;
    }> {
        if (this.config.mode === 'mock') {
            this.log('[Mock] Simulating CCTP transfer...');
            // Simulate network delay
            await this.sleep(100);

            return {
                success: true,
                txHash: '0xmock_transfer_' + Date.now().toString(16),
                chain: 'base',
            };
        }

        // Live mode: Execute actual transfer
        this.log('[Live] Executing CCTP transfer via ArcTransferLeg...');

        try {
            const arcTransfer = new ArcTransferLeg({
                amount: this.config.amount,
                recipient: this.config.recipient,
            });

            const estimate = await arcTransfer.estimate();
            this.log(
                `Transfer estimate: ${estimate.gasEstimate} gas, ~${estimate.estimatedTimeMs}ms`
            );

            const receipt: LegReceipt = await arcTransfer.execute();

            return {
                success: receipt.success,
                txHash: receipt.txHash,
                chain: receipt.chain,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Transfer failed';
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Evaluate risk using the SettleAgent's simulator
     *
     * In mock mode, returns preset risk metrics.
     * In live mode, runs actual risk simulation.
     *
     * @returns Risk metrics and recommended decision
     */
    private async evaluateRisk(): Promise<{
        risk: RiskMetrics;
        decision: AgentDecision;
    }> {
        if (this.config.mode === 'mock') {
            this.log('[Mock] Using simulated risk metrics...');
            await this.sleep(50);

            // Create agent to use its decision logic even in mock mode
            const agent = new SettleAgent(
                this.config.agentPolicy || {},
                undefined, // no account for simulation
                'unichainSepolia'
            );

            const decision = agent.makeDecision(MOCK_RISK_METRICS);

            return {
                risk: MOCK_RISK_METRICS,
                decision,
            };
        }

        // Live mode: Initialize agent and run simulation
        this.log('[Live] Initializing SettleAgent for risk evaluation...');

        const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

        if (privateKey) {
            this.agent = createSettleAgent(
                privateKey,
                this.config.agentPolicy || {},
                'unichainSepolia'
            );
        } else {
            this.agent = new SettleAgent(
                this.config.agentPolicy || {},
                undefined,
                'unichainSepolia'
            );
        }

        const intent: DepositLiquidityIntent = {
            poolId: this.config.poolId,
            amount: this.config.amount,
        };

        const { risk, decision } = await this.agent.simulateOnly(intent);

        return { risk, decision };
    }

    /**
     * Execute based on the agent's decision
     *
     * @param decision - Agent decision ('execute', 'wait', or 'abort')
     * @param risk - Risk metrics at time of decision
     * @returns Execution result
     */
    private async executeBasedOnDecision(
        decision: AgentDecision,
        risk: RiskMetrics
    ): Promise<ExecutionResult> {
        if (this.config.mode === 'mock') {
            this.log('[Mock] Simulating execution...');
            await this.sleep(100);

            switch (decision) {
                case 'execute':
                    return {
                        ...MOCK_EXECUTION_RESULT,
                        risk,
                        timestamp: Date.now(),
                    };

                case 'wait':
                    return {
                        status: 'aborted',
                        reason: 'Mock mode: wait decision simulated as abort after max retries',
                        risk,
                        timestamp: Date.now(),
                    };

                case 'abort':
                    return {
                        status: 'aborted',
                        reason: 'Risk thresholds exceeded',
                        risk,
                        timestamp: Date.now(),
                    };
            }
        }

        // Live mode: Execute via agent
        this.log('[Live] Executing via SettleAgent...');

        if (!this.agent) {
            return {
                status: 'failed',
                reason: 'Agent not initialized',
                risk,
                timestamp: Date.now(),
            };
        }

        const intent: DepositLiquidityIntent = {
            poolId: this.config.poolId,
            amount: this.config.amount,
            recipient: this.config.recipient,
        };

        return this.agent.evaluateAndExecute(intent, this.config.poolKey);
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
    generateReport(result: E2ETestResult): TestReport {
        const success =
            result.transfer.success && result.execution.status === 'completed';

        let summary: string;
        if (success) {
            summary = `✓ End-to-end test PASSED (${result.metadata.durationMs}ms)`;
        } else if (!result.transfer.success) {
            summary = `✗ End-to-end test FAILED: Transfer failed - ${result.transfer.error}`;
        } else if (result.execution.status === 'aborted') {
            summary = `⚠ End-to-end test ABORTED: ${result.execution.reason}`;
        } else {
            summary = `✗ End-to-end test FAILED: ${result.execution.reason}`;
        }

        return {
            summary,
            success,
            result,
            logs: [...this.logs],
        };
    }

    /**
     * Get the current log entries
     */
    getLogs(): string[] {
        return [...this.logs];
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
 * Run the end-to-end test with the given configuration
 */
export async function runEndToEndTest(
    config: Partial<TestConfig> = {}
): Promise<TestReport> {
    // Default test configuration
    const defaultConfig: TestConfig = {
        mode: 'mock',
        amount: '1000000', // 1 USDC (6 decimals)
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

    const orchestrator = new EndToEndOrchestrator(mergedConfig);
    const result = await orchestrator.runFullFlow();
    const report = orchestrator.generateReport(result);

    console.log('\n========================================');
    console.log('TEST REPORT');
    console.log('========================================');
    console.log(report.summary);
    console.log('\nTransfer:', result.transfer.success ? 'SUCCESS' : 'FAILED');
    console.log('Decision:', result.decision);
    console.log('Execution:', result.execution.status);
    console.log(`Duration: ${result.metadata.durationMs}ms`);

    return report;
}

// Test Scenarios

/**
 * Happy path: Transfer succeeds, risk is acceptable, liquidity deposited
 */
export async function testHappyPath(): Promise<TestReport> {
    console.log('\n🧪 TEST: Happy Path');
    return runEndToEndTest({
        mode: 'mock',
        amount: '1000000',
        agentPolicy: {
            max_slippage: 0.02, // Generous slippage tolerance
            min_confidence: 0.70, // Lower confidence threshold
        },
    });
}

/**
 * High slippage: Transfer succeeds, agent waits/aborts due to slippage
 */
export async function testHighSlippage(): Promise<TestReport> {
    console.log('\n🧪 TEST: High Slippage Scenario');
    return runEndToEndTest({
        mode: 'mock',
        amount: '1000000',
        agentPolicy: {
            max_slippage: 0.001, // Very tight slippage (0.1%)
            min_confidence: 0.80,
        },
    });
}

/**
 * Low confidence: Agent aborts due to low confidence
 */
export async function testLowConfidence(): Promise<TestReport> {
    console.log('\n🧪 TEST: Low Confidence Scenario');
    return runEndToEndTest({
        mode: 'mock',
        amount: '1000000',
        agentPolicy: {
            max_slippage: 0.01,
            min_confidence: 0.99, // Very high confidence required
        },
    });
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Run all test scenarios when executed directly
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     SettleKit End-to-End Integration Test Suite            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const results: { name: string; report: TestReport }[] = [];

    // Run test scenarios
    const happyPathReport = await testHappyPath();
    results.push({ name: 'Happy Path', report: happyPathReport });

    const highSlippageReport = await testHighSlippage();
    results.push({ name: 'High Slippage', report: highSlippageReport });

    const lowConfidenceReport = await testLowConfidence();
    results.push({ name: 'Low Confidence', report: lowConfidenceReport });

    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    let passed = 0;
    let failed = 0;
    let aborted = 0;

    for (const { name, report } of results) {
        const status = report.success
            ? '✓ PASS'
            : report.result.execution.status === 'aborted'
              ? '⚠ ABORT'
              : '✗ FAIL';

        console.log(`  ${status} - ${name}`);

        if (report.success) passed++;
        else if (report.result.execution.status === 'aborted') aborted++;
        else failed++;
    }

    console.log('\n----------------------------------------');
    console.log(`  Passed: ${passed} | Aborted: ${aborted} | Failed: ${failed}`);
    console.log('----------------------------------------');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
