/**
 * FullFlowOrchestrator - Coordinates the complete cross-chain liquidity provision flow
 *
 * Orchestrates all three legs of the cross-chain transfer:
 * 1. ArcTransferLeg - CCTP transfer from Base to Arc
 * 2. HubToUnichainLeg - CCTP transfer from Arc to Unichain
 * 3. SettleAgent - Risk evaluation and Uniswap v4 liquidity deposit
 *
 * Flow: Base (USDC) → Arc Hub (CCTP) → Unichain (CCTP) → Uniswap v4 Pool
 *
 * @example
 * ```typescript
 * const orchestrator = new FullFlowOrchestrator({
 *   amount: '5.0',
 *   recipient: '0x...',
 *   poolKey: { ... },
 * });
 *
 * const result = await orchestrator.execute();
 * console.log(result.execution.status); // 'completed'
 * ```
 */

import type { Address } from 'viem';
import { parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { ArcTransferLeg } from '../legs/ArcTransferLeg';
import { HubToUnichainLeg } from '../legs/HubToUnichainLeg';
import type { LegReceipt } from '../types/leg-types';
import type {
    AgentPolicy,
    AgentDecision,
    DepositLiquidityIntent,
    ExecutionResult,
} from '../types/agent';
import type { RiskMetrics } from '../types/risk';
import {
    SettleAgent,
    createSettleAgent,
} from '../../../agent/SettleAgent';
import {
    UniswapLiquidityExecutor,
    type LiquidityDepositParams,
} from '../../../agent/UniswapLiquidityExecutor';
import { getPoolState } from '../utils/pool-utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Pool key for Uniswap v4
 */
export interface PoolKey {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
}

/**
 * Configuration for the full flow orchestrator
 */
export interface FullFlowConfig {
    /** Human-readable USDC amount (e.g., "5.0" = 5 USDC) */
    amount: string;
    /** Final recipient address for the liquidity position */
    recipient: string;
    /** Optional custom agent policy overrides */
    agentPolicy?: Partial<AgentPolicy>;
    /** Pool key for Uniswap v4 */
    poolKey: PoolKey;
    /** Optional direct pool ID (overrides computed poolId from poolKey) */
    poolId?: `0x${string}`;
}

/**
 * Result of the full flow execution
 */
export interface FullFlowResult {
    /** Leg 1: Base → Arc CCTP transfer receipt */
    leg1_baseToArc: LegReceipt;
    /** Leg 2: Arc → Unichain CCTP transfer receipt */
    leg2_arcToUnichain: LegReceipt;
    /** Risk metrics from the agent's simulation */
    riskMetrics: RiskMetrics;
    /** Agent's decision based on risk evaluation */
    decision: AgentDecision;
    /** Final execution result (liquidity deposit) */
    execution: ExecutionResult;
    /** Metadata about the full flow */
    metadata: {
        startTime: number;
        endTime: number;
        durationMs: number;
        amount: string;
        recipient: string;
    };
}

/**
 * Error result when a leg fails
 */
export interface FullFlowError {
    success: false;
    failedLeg: 'leg1_baseToArc' | 'leg2_arcToUnichain' | 'riskEvaluation' | 'execution';
    error: string;
    partialResult?: Partial<FullFlowResult>;
}

// ============================================================================
// FullFlowOrchestrator Class
// ============================================================================

/**
 * FullFlowOrchestrator coordinates the complete 3-leg cross-chain flow:
 *
 * ```
 * Base Sepolia (USDC)
 *       │
 *       ▼ [Leg 1: ArcTransferLeg]
 * Arc Hub (USDC)
 *       │
 *       ▼ [Leg 2: HubToUnichainLeg]
 * Unichain (USDC)
 *       │
 *       ▼ [Leg 3: SettleAgent + UniswapLiquidityExecutor]
 * Uniswap v4 Pool (LP Position)
 * ```
 */
export class FullFlowOrchestrator {
    private config: FullFlowConfig;
    private agent: SettleAgent | null = null;
    private executor: UniswapLiquidityExecutor | null = null;
    private logs: string[] = [];

    constructor(config: FullFlowConfig) {
        this.config = config;
    }

    /**
     * Execute the complete 3-leg flow
     *
     * @returns FullFlowResult on success, FullFlowError on failure
     */
    async execute(): Promise<FullFlowResult | FullFlowError> {
        const startTime = Date.now();
        this.logs = [];

        this.log('═'.repeat(60));
        this.log('  FullFlowOrchestrator - Cross-Chain Liquidity Provision');
        this.log('═'.repeat(60));
        this.log(`Amount: ${this.config.amount} USDC`);
        this.log(`Recipient: ${this.config.recipient}`);
        this.log('');

        try {
            // ══════════════════════════════════════════════════════════════
            // Leg 1: Base → Arc (ArcTransferLeg)
            // ══════════════════════════════════════════════════════════════
            this.log('─'.repeat(60));
            this.log('  LEG 1: Base Sepolia → Arc Hub (CCTP)');
            this.log('─'.repeat(60));

            const leg1Receipt = await this.executeLeg1();

            if (!leg1Receipt.success) {
                this.log(`✗ Leg 1 FAILED`);
                return {
                    success: false,
                    failedLeg: 'leg1_baseToArc',
                    error: `ArcTransferLeg failed: ${leg1Receipt.txHash || 'unknown error'}`,
                };
            }

            this.log(`✓ Leg 1 SUCCESS - TxHash: ${leg1Receipt.txHash}`);
            this.log('');

            // ══════════════════════════════════════════════════════════════
            // Leg 2: Arc → Unichain (HubToUnichainLeg)
            // ══════════════════════════════════════════════════════════════
            this.log('─'.repeat(60));
            this.log('  LEG 2: Arc Hub → Unichain (CCTP)');
            this.log('─'.repeat(60));

            const leg2Receipt = await this.executeLeg2();

            if (!leg2Receipt.success) {
                this.log(`✗ Leg 2 FAILED`);
                return {
                    success: false,
                    failedLeg: 'leg2_arcToUnichain',
                    error: `HubToUnichainLeg failed: ${leg2Receipt.txHash || 'unknown error'}`,
                    partialResult: {
                        leg1_baseToArc: leg1Receipt,
                    },
                };
            }

            this.log(`✓ Leg 2 SUCCESS - TxHash: ${leg2Receipt.txHash}`);
            this.log('');

            // ══════════════════════════════════════════════════════════════
            // Leg 3: Risk Evaluation + Uniswap Execution (SettleAgent)
            // ══════════════════════════════════════════════════════════════
            this.log('─'.repeat(60));
            this.log('  LEG 3: Risk Evaluation + Uniswap v4 Deposit');
            this.log('─'.repeat(60));

            // Initialize agent and executor
            await this.initializeAgent();

            // Evaluate risk
            const { risk, decision } = await this.evaluateRisk();

            this.log(`Risk Metrics:`);
            this.log(`  - Confidence: ${(risk.execution_confidence * 100).toFixed(1)}%`);
            this.log(`  - Slippage P95: ${(risk.slippage_p95 * 100).toFixed(2)}%`);
            this.log(`  - Price Impact: ${(risk.price_impact * 100).toFixed(2)}%`);
            this.log(`Agent Decision: ${decision.toUpperCase()}`);

            // Execute based on decision
            const execution = await this.executeBasedOnDecision(decision, risk);

            if (execution.status === 'completed') {
                this.log(`✓ Leg 3 SUCCESS - TxHash: ${execution.txHash}`);
                if (execution.positionId) {
                    this.log(`  Position NFT ID: ${execution.positionId}`);
                }
            } else if (execution.status === 'aborted') {
                this.log(`⚠ Leg 3 ABORTED - ${execution.reason}`);
            } else {
                this.log(`✗ Leg 3 FAILED - ${execution.reason}`);
            }

            const endTime = Date.now();

            // ══════════════════════════════════════════════════════════════
            // Summary
            // ══════════════════════════════════════════════════════════════
            this.log('');
            this.log('═'.repeat(60));
            this.log('  FULL FLOW COMPLETE');
            this.log('═'.repeat(60));
            this.log(`Total Duration: ${endTime - startTime}ms`);
            this.log(`Final Status: ${execution.status.toUpperCase()}`);

            return {
                leg1_baseToArc: leg1Receipt,
                leg2_arcToUnichain: leg2Receipt,
                riskMetrics: risk,
                decision,
                execution,
                metadata: {
                    startTime,
                    endTime,
                    durationMs: endTime - startTime,
                    amount: this.config.amount,
                    recipient: this.config.recipient,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`✗ FATAL ERROR: ${errorMessage}`);

            return {
                success: false,
                failedLeg: 'execution',
                error: errorMessage,
            };
        }
    }

    /**
     * Execute Leg 1: Base → Arc via ArcTransferLeg
     */
    private async executeLeg1(): Promise<LegReceipt> {
        this.log(`Creating ArcTransferLeg...`);
        this.log(`  Amount: ${this.config.amount} USDC`);
        this.log(`  Recipient: ${this.config.recipient}`);

        const leg = new ArcTransferLeg({
            amount: this.config.amount,
            recipient: this.config.recipient,
        });

        // Get estimate
        const estimate = await leg.estimate();
        this.log(`Estimate:`);
        this.log(`  - Gas: ${estimate.gasEstimate}`);
        this.log(`  - Time: ${estimate.estimatedTimeMs}ms`);
        this.log(`  - Failure Probability: ${(estimate.failureProbability * 100).toFixed(1)}%`);

        // Execute
        this.log(`Executing ArcTransferLeg...`);
        const receipt = await leg.execute();

        return receipt;
    }

    /**
     * Execute Leg 2: Arc → Unichain via HubToUnichainLeg
     */
    private async executeLeg2(): Promise<LegReceipt> {
        this.log(`Creating HubToUnichainLeg...`);
        this.log(`  Amount: ${this.config.amount} USDC`);
        this.log(`  Recipient: ${this.config.recipient}`);

        const leg = new HubToUnichainLeg({
            amount: this.config.amount,
            recipient: this.config.recipient,
        });

        // Get estimate
        const estimate = await leg.estimate();
        this.log(`Estimate:`);
        this.log(`  - Gas: ${estimate.gasEstimate}`);
        this.log(`  - Time: ${estimate.estimatedTimeMs}ms`);
        this.log(`  - Failure Probability: ${(estimate.failureProbability * 100).toFixed(1)}%`);

        // Execute
        this.log(`Executing HubToUnichainLeg...`);
        const receipt = await leg.execute();

        return receipt;
    }

    /**
     * Initialize the SettleAgent and UniswapLiquidityExecutor
     */
    private async initializeAgent(): Promise<void> {
        this.log(`Initializing SettleAgent...`);

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
            this.log(`  Wallet configured for transaction signing`);
        } else {
            // Simulation-only mode (no wallet)
            this.agent = new SettleAgent(
                this.config.agentPolicy || {},
                undefined,
                'unichainSepolia'
            );
            this.log(`  No wallet configured - running in simulation-only mode`);
        }
    }

    /**
     * Evaluate risk using the SettleAgent's simulator
     */
    private async evaluateRisk(): Promise<{
        risk: RiskMetrics;
        decision: AgentDecision;
    }> {
        if (!this.agent) {
            throw new Error('Agent not initialized');
        }

        // Convert human-readable amount to raw USDC base units (6 decimals)
        const USDC_DECIMALS = 6;
        const rawAmount = parseUnits(this.config.amount, USDC_DECIMALS).toString();

        // Compute pool ID from pool key if not provided
        const poolId = this.config.poolId || this.computePoolId();

        // Build the liquidity deposit intent
        const intent: DepositLiquidityIntent = {
            poolId,
            amount: rawAmount,
        };

        this.log(`Running risk simulation...`);
        this.log(`  Pool: ${poolId.slice(0, 18)}...`);
        this.log(`  Amount: ${this.config.amount} USDC (${rawAmount} raw)`);

        // Use simulateOnly() to get risk metrics and decision without executing
        const { risk, decision, reason } = await this.agent.simulateOnly(intent);

        if (reason) {
            this.log(`  Evaluation reason: ${reason}`);
        }

        return { risk, decision };
    }

    /**
     * Execute based on the agent's decision
     */
    private async executeBasedOnDecision(
        decision: AgentDecision,
        risk: RiskMetrics,
        retryCount: number = 0
    ): Promise<ExecutionResult> {
        const policy = this.config.agentPolicy || {};
        const maxRetries = policy.retry_attempts ?? 3;
        const retryDelaySeconds = policy.retry_delay_seconds ?? 30;

        switch (decision) {
            case 'execute':
                return this.executeLiquidityDeposit(risk);

            case 'wait':
                if (retryCount < maxRetries) {
                    this.log(`Waiting ${retryDelaySeconds}s before retry ${retryCount + 1}/${maxRetries}...`);
                    await this.sleep(retryDelaySeconds * 1000);

                    // Re-evaluate risk after waiting
                    const { risk: newRisk, decision: newDecision } = await this.evaluateRisk();
                    this.log(`New decision after wait: ${newDecision}`);

                    return this.executeBasedOnDecision(newDecision, newRisk, retryCount + 1);
                }

                // Max retries exceeded
                this.log(`Max retries (${maxRetries}) exceeded while waiting`);
                return {
                    status: 'aborted',
                    reason: `Max retries (${maxRetries}) exceeded while waiting for favorable conditions`,
                    risk,
                    timestamp: Date.now(),
                };

            case 'abort':
                const abortReason = this.getAbortReason(risk);
                this.log(`Aborting: ${abortReason}`);
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
     */
    private async executeLiquidityDeposit(risk: RiskMetrics): Promise<ExecutionResult> {
        this.log(`Executing liquidity deposit...`);

        // Check if executor is available
        if (!this.executor) {
            this.log(`No executor available - simulation mode only`);
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

        // Convert human-readable amount to raw USDC base units
        const USDC_DECIMALS = 6;
        const rawAmount = parseUnits(this.config.amount, USDC_DECIMALS).toString();
        const poolId = this.config.poolId || this.computePoolId();

        this.log(`  Amount: ${this.config.amount} USDC -> ${rawAmount} raw units`);

        // Fetch current pool state for tick positioning
        const poolState = await getPoolState(poolId, 'unichainSepolia');
        const currentTick = poolState.tick;
        this.log(`  Current pool tick: ${currentTick}`);

        // One-sided lower price strategy for USDC-only deposit
        const tickSpacing = this.config.poolKey.tickSpacing;
        const tickLower = Math.floor((currentTick - 2000) / tickSpacing) * tickSpacing;
        const tickUpper = Math.floor((currentTick - 100) / tickSpacing) * tickSpacing;

        this.log(`  Tick range: ${tickLower} to ${tickUpper}`);

        // Build deposit intent
        const intent: DepositLiquidityIntent = {
            poolId,
            amount: rawAmount,
            recipient: this.config.recipient,
            tickLower,
            tickUpper,
        };

        try {
            const result = await this.executor.depositFromIntent(intent, this.config.poolKey);

            if (result.success) {
                this.log(`Deposit successful!`);
                return {
                    status: 'completed',
                    txHash: result.txHash,
                    positionId: result.positionId,
                    risk,
                    timestamp: Date.now(),
                };
            } else {
                this.log(`Deposit failed: ${result.error}`);
                return {
                    status: 'failed',
                    reason: result.error || 'Unknown error during liquidity deposit',
                    risk,
                    timestamp: Date.now(),
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`Execution error: ${errorMessage}`);
            return {
                status: 'failed',
                reason: errorMessage,
                risk,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Compute the pool ID from the pool key using keccak256(abi.encode(poolKey))
     */
    private computePoolId(): `0x${string}` {
        const { encodeAbiParameters, keccak256 } = require('viem');

        const encoded = encodeAbiParameters(
            [
                { type: 'address' },
                { type: 'address' },
                { type: 'uint24' },
                { type: 'int24' },
                { type: 'address' },
            ],
            [
                this.config.poolKey.currency0,
                this.config.poolKey.currency1,
                this.config.poolKey.fee,
                this.config.poolKey.tickSpacing,
                this.config.poolKey.hooks,
            ]
        );

        return keccak256(encoded);
    }

    /**
     * Get a human-readable abort reason based on risk metrics
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
     * Get all logs from this execution
     */
    getLogs(): string[] {
        return [...this.logs];
    }

    /**
     * Internal logging helper
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] [FullFlowOrchestrator] ${message}`;
        this.logs.push(entry);
        console.log(entry);
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/**
 * Factory function to create a FullFlowOrchestrator with common defaults
 */
export function createFullFlowOrchestrator(
    amount: string,
    recipient: string,
    poolKey: PoolKey,
    agentPolicy?: Partial<AgentPolicy>
): FullFlowOrchestrator {
    return new FullFlowOrchestrator({
        amount,
        recipient,
        poolKey,
        agentPolicy,
    });
}

export default FullFlowOrchestrator;
