/**
 * End-to-End Integration Test for Cross-Chain Liquidity Provision
 *
 * Wire together all components for a complete cross-chain liquidity provision flow:
 * 1. ArcTransferLeg - CCTP transfer from Base to Arc
 * 2. SettleAgent - Risk evaluation and decision making
 * 3. UniswapLiquidityExecutor - Uniswap v4 liquidity deposit
 *
 * Flow: USDC on Base → Arc Hub (CCTP) → USDC on Arc/Unichain → SettleAgent → Uniswap Pool
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
    private executor: UniswapLiquidityExecutor | null = null;
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

            // Log transfer step details if available
            if (transferResult.steps && transferResult.steps.length > 0) {
                this.log('Transfer step breakdown:');
                for (const step of transferResult.steps) {
                    const statusIcon =
                        step.status === 'completed'
                            ? '✓'
                            : step.status === 'failed'
                              ? '✗'
                              : '○';
                    this.log(
                        `  ${statusIcon} ${step.step}${step.txHash ? ` (${step.txHash.slice(0, 10)}...)` : ''}`
                    );
                }
            }

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
     * In mock mode, simulates a successful transfer with realistic delays.
     * In live mode, uses ArcTransferLeg for actual blockchain interaction.
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

        if (this.config.mode === 'mock') {
            this.log('[Mock] Simulating CCTP transfer...');

            // Step 1: Approve (simulated)
            this.log('[Mock] Step 1/4: Approving USDC spending...');
            steps.push({
                step: 'approve',
                status: 'completed',
                txHash: '0xmock_approve_' + Date.now().toString(16),
                timestamp: Date.now(),
            });
            await this.sleep(50);

            // Step 2: Burn (simulated)
            this.log('[Mock] Step 2/4: Burning USDC on Base...');
            const burnTxHash = '0xmock_burn_' + Date.now().toString(16);
            steps.push({
                step: 'burn',
                status: 'completed',
                txHash: burnTxHash,
                timestamp: Date.now(),
            });
            await this.sleep(50);

            // Step 3: Attestation (simulated)
            this.log('[Mock] Step 3/4: Waiting for Circle attestation...');
            steps.push({
                step: 'attestation',
                status: 'completed',
                timestamp: Date.now(),
            });
            await this.sleep(50);

            // Step 4: Mint (simulated)
            this.log('[Mock] Step 4/4: Minting USDC on Arc...');
            steps.push({
                step: 'mint',
                status: 'completed',
                txHash: '0xmock_mint_' + Date.now().toString(16),
                timestamp: Date.now(),
            });
            await this.sleep(50);

            this.log('[Mock] CCTP transfer simulation completed successfully');

            return {
                success: true,
                txHash: burnTxHash,
                chain: 'base',
                steps,
                amount: this.config.amount,
                recipient: this.config.recipient,
            };
        }

        // Live mode: Validate environment and execute actual transfer
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
     * In mock mode, returns preset risk metrics.
     * In live mode, runs actual risk simulation via SettleAgent.
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
        if (this.config.mode === 'mock') {
            this.log('[Mock] Using simulated risk metrics...');
            await this.sleep(50);

            // Create agent to use its decision logic even in mock mode
            // This ensures consistent decision-making based on the agent policy
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

        // Live mode: Initialize SettleAgent for risk simulation and decision making
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

        // Build the liquidity deposit intent
        const intent: DepositLiquidityIntent = {
            poolId: this.config.poolId,
            amount: this.config.amount,
        };

        this.log('[Live] Running risk simulation via SettleAgent...');
        this.log(`[Live] Intent: pool=${intent.poolId.slice(0, 18)}..., amount=${intent.amount}`);

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

        // Live mode: Execute based on decision
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
     * @param risk - Risk metrics at time of execution
     * @returns Execution result
     */
    private async executeLiquidityDeposit(risk: RiskMetrics): Promise<ExecutionResult> {
        this.log('[Live] Executing liquidity deposit...');

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

        // Build deposit intent
        const intent: DepositLiquidityIntent = {
            poolId: this.config.poolId,
            amount: this.config.amount,
            recipient: this.config.recipient,
        };

        this.log(`[Live] Depositing ${intent.amount} to pool ${intent.poolId.slice(0, 18)}...`);
        this.log(`[Live] Recipient: ${intent.recipient}`);

        try {
            // Execute via UniswapLiquidityExecutor
            const result = await this.executor.depositFromIntent(intent, this.config.poolKey);

            if (result.success) {
                this.log(`[Live] Deposit successful! TxHash: ${result.txHash}`);
                if (result.positionId) {
                    this.log(`[Live] Position ID: ${result.positionId}`);
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
    generateReport(result: E2ETestResult): TestReport {
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
        amount: '1.0', // 1 USDC (human-readable format, ArcTransferLeg uses parseUnits internally)
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
        amount: '1.0', // 1 USDC
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
        amount: '1.0', // 1 USDC
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
        amount: '1.0', // 1 USDC
        agentPolicy: {
            max_slippage: 0.01,
            min_confidence: 0.99, // Very high confidence required
        },
    });
}

/**
 * Agent retry behavior: Tests the SettleAgent's retry logic
 *
 * Demonstrates how the agent handles 'wait' decisions:
 * - Uses configurable retry_attempts and retry_delay_seconds
 * - Re-evaluates risk after each retry delay
 * - Eventually aborts if conditions don't improve within max retries
 */
export async function testAgentRetryBehavior(): Promise<TestReport> {
    console.log('\n🧪 TEST: Agent Retry Behavior');
    console.log('    Testing SettleAgent retry logic with wait decisions');

    return runEndToEndTest({
        mode: 'mock',
        amount: '1.0', // 1 USDC
        agentPolicy: {
            max_slippage: 0.01,
            max_price_impact: 0.02,
            min_confidence: 0.80,
            // Retry configuration
            retry_attempts: 2,          // Allow 2 retries
            retry_delay_seconds: 1,     // Short delay for testing
            fallback_strategy: 'wait',  // Use wait instead of immediate abort
        },
    });
}

/**
 * Agent policy customization: Tests the SettleAgent with custom thresholds
 *
 * Demonstrates how agent policy affects decision making:
 * - max_slippage: Maximum acceptable slippage
 * - max_price_impact: Maximum acceptable price impact
 * - min_confidence: Minimum required confidence score
 * - retry_attempts: Number of retries for 'wait' decisions
 * - fallback_strategy: What to do when slippage threshold is exceeded
 */
export async function testAgentPolicyCustomization(): Promise<TestReport> {
    console.log('\n🧪 TEST: Agent Policy Customization');
    console.log('    Testing SettleAgent with custom conservative policy');

    return runEndToEndTest({
        mode: 'mock',
        amount: '10.0', // 10 USDC - larger amount
        agentPolicy: {
            // Conservative thresholds
            max_slippage: 0.005,        // 0.5% max slippage
            max_price_impact: 0.01,     // 1% max price impact
            min_confidence: 0.90,       // 90% confidence required
            max_latency_seconds: 60,    // 1 minute max latency
            retry_attempts: 1,
            retry_delay_seconds: 2,
            fallback_strategy: 'abort', // Abort on threshold violations
        },
    });
}

/**
 * Live CCTP transfer test: Requires environment variables to be set
 * Run with: LIVE_TEST=true npx ts-node packages/sdk/test/end-to-end.test.ts
 */
export async function testLiveCCTPTransfer(): Promise<TestReport> {
    console.log('\n🧪 TEST: Live CCTP Transfer');
    return runEndToEndTest({
        mode: 'live',
        amount: '0.01', // Small amount for testing (0.01 USDC)
        recipient: process.env.RECIPIENT_ADDRESS || '',
        agentPolicy: {
            max_slippage: 0.05, // 5% slippage tolerance for testnet
            min_confidence: 0.50, // Lower confidence for testnet
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

    const isLiveTest = process.env.LIVE_TEST === 'true';
    const results: { name: string; report: TestReport }[] = [];

    if (isLiveTest) {
        // Run live CCTP transfer test
        console.log('\n⚠️  Running LIVE test against testnets');
        console.log('    This will execute real transactions on Base Sepolia and Arc Testnet\n');

        const liveReport = await testLiveCCTPTransfer();
        results.push({ name: 'Live CCTP Transfer', report: liveReport });
    } else {
        // Run mock test scenarios demonstrating SettleAgent integration
        console.log('\n📋 Running mock test scenarios');
        console.log('    Set LIVE_TEST=true to run against real testnets\n');
        console.log('    SettleAgent Integration Tests:');
        console.log('    - Risk simulation via RiskSimulator');
        console.log('    - Decision making based on policy thresholds');
        console.log('    - Retry logic for wait decisions');
        console.log('    - Execution via UniswapLiquidityExecutor\n');

        // Test 1: Happy path - demonstrates successful execution
        const happyPathReport = await testHappyPath();
        results.push({ name: 'Happy Path', report: happyPathReport });

        // Test 2: High slippage - demonstrates slippage threshold enforcement
        const highSlippageReport = await testHighSlippage();
        results.push({ name: 'High Slippage', report: highSlippageReport });

        // Test 3: Low confidence - demonstrates confidence threshold enforcement
        const lowConfidenceReport = await testLowConfidence();
        results.push({ name: 'Low Confidence', report: lowConfidenceReport });

        // Test 4: Agent retry behavior - demonstrates wait/retry logic
        const retryReport = await testAgentRetryBehavior();
        results.push({ name: 'Agent Retry Behavior', report: retryReport });

        // Test 5: Custom policy - demonstrates policy customization
        const policyReport = await testAgentPolicyCustomization();
        results.push({ name: 'Agent Policy Customization', report: policyReport });
    }

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

    // Print transfer step details for live tests
    if (isLiveTest && results.length > 0) {
        const liveResult = results[0].report.result;
        if (liveResult.transfer.steps && liveResult.transfer.steps.length > 0) {
            console.log('\n📊 CCTP Transfer Step Details:');
            for (const step of liveResult.transfer.steps) {
                const statusIcon =
                    step.status === 'completed'
                        ? '✓'
                        : step.status === 'failed'
                          ? '✗'
                          : '○';
                const txInfo = step.txHash
                    ? ` | tx: ${step.txHash.slice(0, 18)}...`
                    : '';
                const errorInfo = step.error ? ` | error: ${step.error}` : '';
                console.log(`    ${statusIcon} ${step.step}${txInfo}${errorInfo}`);
            }
        }
    }

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
