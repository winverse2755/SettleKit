// packages/sdk/src/agents/SettleAgent.ts
// Agent Decision Engine for automated liquidity execution

import type { Account } from 'viem';
import { RiskSimulator } from '../simulators/RiskSimulator';
import {
    UniswapLiquidityExecutor,
    type LiquidityDepositParams,
} from './UniswapLiquidityExecutor';
import type {
    AgentPolicy,
    AgentDecision,
    DepositLiquidityIntent,
    ExecutionResult,
    ExecutionLog,
} from '../types/agent';
import type { RiskMetrics, SimulationParams } from '../types/risk';
import type { ChainKey } from '../config/networks';

/**
 * Default agent policy with conservative thresholds
 */
export const DEFAULT_AGENT_POLICY: AgentPolicy = {
    max_slippage: 0.01,          // 1%
    max_latency_seconds: 300,     // 5 minutes
    max_price_impact: 0.02,       // 2%
    min_confidence: 0.80,         // 80%
    retry_attempts: 3,
    retry_delay_seconds: 30,
    fallback_strategy: 'wait',
};

/**
 * Sleep utility for retry delays
 */
function sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * SettleAgent - Automated Decision Engine for Cross-Chain Liquidity Provision
 * 
 * The SettleAgent evaluates market conditions using the RiskSimulator and makes
 * autonomous decisions about when to execute liquidity deposits based on configurable
 * policy thresholds.
 * 
 * Key features:
 * - Risk-based decision making with configurable thresholds
 * - Automatic retry logic with configurable delays
 * - Full execution history for audit and compliance
 * - Transparent decision tree for reproducibility
 * 
 * @example
 * ```typescript
 * const agent = new SettleAgent(policy, account);
 * const result = await agent.evaluateAndExecute({
 *   poolId: '0x...',
 *   amount: '1000000', // 1 USDC
 * });
 * console.log(result.status); // 'completed' | 'aborted' | 'failed'
 * ```
 */
export class SettleAgent {
    private policy: AgentPolicy;
    private simulator: RiskSimulator;
    private executor: UniswapLiquidityExecutor;
    private executionLog: ExecutionLog[] = [];
    private chainKey: ChainKey;

    /**
     * Create a new SettleAgent instance
     * 
     * @param policy - Agent policy configuration (uses DEFAULT_AGENT_POLICY if not provided)
     * @param account - Viem account for transaction signing (optional for simulation-only mode)
     * @param chainKey - Target chain for operations (default: unichainSepolia)
     */
    constructor(
        policy: Partial<AgentPolicy> = {},
        account?: Account,
        chainKey: ChainKey = 'unichainSepolia'
    ) {
        this.policy = { ...DEFAULT_AGENT_POLICY, ...policy };
        this.chainKey = chainKey;
        this.simulator = new RiskSimulator(chainKey);
        this.executor = new UniswapLiquidityExecutor(account, chainKey);
    }

    /**
     * Main entry point - Evaluate risk and execute liquidity deposit if conditions are favorable
     * 
     * This method:
     * 1. Simulates the cross-chain transfer and pool conditions
     * 2. Makes a decision based on risk metrics and policy
     * 3. Executes, waits, or aborts based on the decision
     * 4. Retries with configured delays if waiting
     * 
     * @param intent - The liquidity deposit intent to evaluate
     * @param poolKey - Pool key for Uniswap v4 (required for execution)
     * @param retryCount - Current retry attempt (internal use)
     * @returns Execution result with status, risk metrics, and optional transaction details
     */
    async evaluateAndExecute(
        intent: DepositLiquidityIntent,
        poolKey?: LiquidityDepositParams['poolKey'],
        retryCount: number = 0
    ): Promise<ExecutionResult> {
        console.log(`[SettleAgent] Evaluating intent for pool ${intent.poolId}, attempt ${retryCount + 1}/${this.policy.retry_attempts + 1}`);

        // Build simulation parameters
        const simulationParams: SimulationParams = {
            sourceChain: 'base',
            hubChain: 'arc',
            destChain: 'unichain',
            poolId: intent.poolId,
            amountIn: intent.amount,
            tokenIn: 'USDC',
            tokenOut: 'USDC', // For liquidity provision, same token
        };

        // Run risk simulation
        const risk = await this.simulator.simulate(simulationParams);
        console.log(`[SettleAgent] Risk simulation complete:`, {
            execution_confidence: risk.execution_confidence.toFixed(2),
            slippage_p95: (risk.slippage_p95 * 100).toFixed(2) + '%',
            price_impact: (risk.price_impact * 100).toFixed(2) + '%',
            finality_delay_p95: risk.finality_delay_p95 + 's',
        });

        // Make decision based on risk metrics
        const decision = this.makeDecision(risk);
        console.log(`[SettleAgent] Decision: ${decision}`);

        // Log the decision
        this.logDecision(decision, risk, intent, retryCount);

        // Execute based on decision
        switch (decision) {
            case 'execute':
                return this.executeLiquidityDeposit(intent, risk, poolKey);

            case 'wait':
                if (retryCount < this.policy.retry_attempts) {
                    console.log(`[SettleAgent] Waiting ${this.policy.retry_delay_seconds}s before retry...`);
                    await sleep(this.policy.retry_delay_seconds);
                    return this.evaluateAndExecute(intent, poolKey, retryCount + 1);
                }
                // Max retries reached, fallback to abort
                console.log(`[SettleAgent] Max retries (${this.policy.retry_attempts}) reached, aborting`);
                return {
                    status: 'aborted',
                    reason: `Max retries (${this.policy.retry_attempts}) exceeded while waiting for favorable conditions`,
                    risk,
                    timestamp: Date.now(),
                };

            case 'abort':
                return {
                    status: 'aborted',
                    reason: this.getAbortReason(risk),
                    risk,
                    timestamp: Date.now(),
                };
        }
    }

    /**
     * Decision Tree - Make a decision based on risk metrics and policy thresholds
     * 
     * Decision logic (in order of priority):
     * 1. Low confidence → abort
     * 2. High slippage → wait or abort (based on fallback_strategy)
     * 3. High latency → wait
     * 4. High price impact → abort
     * 5. All conditions pass → execute
     * 
     * @param risk - Risk metrics from the simulator
     * @returns Decision: 'execute', 'wait', or 'abort'
     */
    makeDecision(risk: RiskMetrics): AgentDecision {
        // Check confidence threshold - abort if too low
        if (risk.execution_confidence < this.policy.min_confidence) {
            console.log(`[SettleAgent] Confidence ${risk.execution_confidence.toFixed(2)} below threshold ${this.policy.min_confidence}`);
            return 'abort';
        }

        // Check slippage threshold
        if (risk.slippage_p95 > this.policy.max_slippage) {
            console.log(`[SettleAgent] Slippage ${(risk.slippage_p95 * 100).toFixed(2)}% exceeds max ${(this.policy.max_slippage * 100).toFixed(2)}%`);
            return this.policy.fallback_strategy === 'wait' ? 'wait' : 'abort';
        }

        // Check latency threshold - wait if too slow
        if (risk.finality_delay_p95 > this.policy.max_latency_seconds) {
            console.log(`[SettleAgent] Latency ${risk.finality_delay_p95}s exceeds max ${this.policy.max_latency_seconds}s`);
            return 'wait';
        }

        // Check price impact threshold - abort if too high
        if (risk.price_impact > this.policy.max_price_impact) {
            console.log(`[SettleAgent] Price impact ${(risk.price_impact * 100).toFixed(2)}% exceeds max ${(this.policy.max_price_impact * 100).toFixed(2)}%`);
            return 'abort';
        }

        // All conditions pass - execute
        return 'execute';
    }

    /**
     * Execute the liquidity deposit via UniswapLiquidityExecutor
     * 
     * @param intent - The deposit intent
     * @param risk - Risk metrics at time of execution
     * @param poolKey - Pool key for Uniswap v4
     * @returns Execution result
     */
    private async executeLiquidityDeposit(
        intent: DepositLiquidityIntent,
        risk: RiskMetrics,
        poolKey?: LiquidityDepositParams['poolKey']
    ): Promise<ExecutionResult> {
        console.log(`[SettleAgent] Executing liquidity deposit of ${intent.amount} to pool ${intent.poolId}`);

        // Check if executor has a wallet configured
        if (!this.executor.hasWallet()) {
            console.warn('[SettleAgent] No wallet configured - running in simulation mode');
            return {
                status: 'completed',
                reason: 'Simulation mode - no wallet configured for actual execution',
                risk,
                timestamp: Date.now(),
            };
        }

        // Require poolKey for actual execution
        if (!poolKey) {
            return {
                status: 'failed',
                reason: 'poolKey is required for liquidity deposit execution',
                risk,
                timestamp: Date.now(),
            };
        }

        try {
            // Execute via UniswapLiquidityExecutor
            const result = await this.executor.depositFromIntent(intent, poolKey);

            if (result.success) {
                console.log(`[SettleAgent] Deposit successful! TxHash: ${result.txHash}, PositionId: ${result.positionId}`);
                return {
                    status: 'completed',
                    txHash: result.txHash,
                    positionId: result.positionId,
                    risk,
                    timestamp: Date.now(),
                };
            } else {
                console.error(`[SettleAgent] Deposit failed: ${result.error}`);
                return {
                    status: 'failed',
                    reason: result.error || 'Unknown error during liquidity deposit',
                    risk,
                    timestamp: Date.now(),
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error(`[SettleAgent] Execution error: ${errorMessage}`);
            return {
                status: 'failed',
                reason: errorMessage,
                risk,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Log a decision for audit and transparency
     * 
     * @param decision - The decision made
     * @param risk - Risk metrics at time of decision
     * @param intent - The original intent
     * @param retryCount - Current retry count
     */
    private logDecision(
        decision: AgentDecision,
        risk: RiskMetrics,
        intent: DepositLiquidityIntent,
        retryCount: number
    ): void {
        const log: ExecutionLog = {
            timestamp: Date.now(),
            decision,
            risk,
            policy: { ...this.policy },
            intent: { ...intent },
            retryCount,
        };

        this.executionLog.push(log);
        console.log(`[SettleAgent] Logged decision: ${decision} at ${new Date(log.timestamp).toISOString()}`);
    }

    /**
     * Get a human-readable abort reason based on risk metrics
     */
    private getAbortReason(risk: RiskMetrics): string {
        const reasons: string[] = [];

        if (risk.execution_confidence < this.policy.min_confidence) {
            reasons.push(`Low confidence (${(risk.execution_confidence * 100).toFixed(1)}% < ${(this.policy.min_confidence * 100).toFixed(1)}%)`);
        }

        if (risk.slippage_p95 > this.policy.max_slippage) {
            reasons.push(`High slippage (${(risk.slippage_p95 * 100).toFixed(2)}% > ${(this.policy.max_slippage * 100).toFixed(2)}%)`);
        }

        if (risk.price_impact > this.policy.max_price_impact) {
            reasons.push(`High price impact (${(risk.price_impact * 100).toFixed(2)}% > ${(this.policy.max_price_impact * 100).toFixed(2)}%)`);
        }

        return reasons.length > 0 ? reasons.join('; ') : 'Risk thresholds exceeded';
    }

    /**
     * Get the full execution history for audit and inspection
     * 
     * @returns Array of all execution log entries
     */
    getExecutionHistory(): ExecutionLog[] {
        return [...this.executionLog];
    }

    /**
     * Clear the execution history
     */
    clearExecutionHistory(): void {
        this.executionLog = [];
    }

    /**
     * Get the current policy configuration
     */
    getPolicy(): AgentPolicy {
        return { ...this.policy };
    }

    /**
     * Update the policy configuration
     * 
     * @param updates - Partial policy updates to apply
     */
    updatePolicy(updates: Partial<AgentPolicy>): void {
        this.policy = { ...this.policy, ...updates };
        console.log('[SettleAgent] Policy updated:', this.policy);
    }

    /**
     * Simulate risk without executing
     * Useful for preview/dry-run scenarios
     * 
     * @param intent - The deposit intent to simulate
     * @returns Risk metrics and recommended decision
     */
    async simulateOnly(intent: DepositLiquidityIntent): Promise<{
        risk: RiskMetrics;
        decision: AgentDecision;
        reason?: string;
    }> {
        const simulationParams: SimulationParams = {
            sourceChain: 'base',
            hubChain: 'arc',
            destChain: 'unichain',
            poolId: intent.poolId,
            amountIn: intent.amount,
            tokenIn: 'USDC',
            tokenOut: 'USDC',
        };

        const risk = await this.simulator.simulate(simulationParams);
        const decision = this.makeDecision(risk);

        return {
            risk,
            decision,
            reason: decision === 'abort' ? this.getAbortReason(risk) : undefined,
        };
    }
}

/**
 * Factory function to create a SettleAgent with a private key
 * 
 * @param privateKey - Private key for transaction signing
 * @param policy - Agent policy configuration
 * @param chainKey - Target chain
 * @returns Configured SettleAgent instance
 */
export function createSettleAgent(
    privateKey: `0x${string}`,
    policy: Partial<AgentPolicy> = {},
    chainKey: ChainKey = 'unichainSepolia'
): SettleAgent {
    const { privateKeyToAccount } = require('viem/accounts');
    const account = privateKeyToAccount(privateKey);
    return new SettleAgent(policy, account, chainKey);
}

export default SettleAgent;
