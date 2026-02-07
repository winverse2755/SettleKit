// Agent Decision Engine for automated liquidity execution

import type { Account } from 'viem';
import { RiskSimulator } from '../sdk/src/simulators/RiskSimulator';
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
    LiquidityPolicy,
    PoolEvaluation,
    PoolSelectionResult,
} from '../sdk/src/types/agent';
import { discoverEthUsdcPools, type DiscoveredPool } from '../sdk/src/utils/pool-discovery';
import type { RiskMetrics, SimulationParams } from '../sdk/src/types/risk';
import type { ChainKey } from '../sdk/src/config/networks';

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
 * Default liquidity policy with sensible defaults for pool selection.
 * 
 * This policy extends DEFAULT_AGENT_POLICY with pool selection criteria:
 * - Accepts any pool liquidity level (min_liquidity: 0n)
 * - Prefers 0.30% fee tier, then 0.05% (common for ETH/USDC)
 * - Allows fee tiers from 0.01% to 1%
 * - Uses a tick range width of 2000 (~20% price range)
 * - Defaults to one-sided USDC positions for simplicity
 */
export const DEFAULT_LIQUIDITY_POLICY: LiquidityPolicy = {
    ...DEFAULT_AGENT_POLICY,
    min_liquidity: 0n,                    // Accept any liquidity level
    preferred_fee_tiers: [3000, 500],     // Prefer 0.30%, then 0.05%
    max_fee_tier: 10000,                  // Max 1%
    min_fee_tier: 100,                    // Min 0.01%
    tick_range_width: 2000,               // ~20% price range
    position_type: 'one_sided_usdc',      // One-sided USDC position
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

    // =========================================================================
    // Pool Evaluation Methods
    // =========================================================================

    /**
     * Evaluate a discovered pool for liquidity provision.
     * 
     * This method runs a risk simulation on the pool and evaluates it against
     * the agent's policy thresholds. It returns a comprehensive evaluation
     * including risk metrics, score, decision, and eligibility.
     * 
     * @param pool - The discovered pool to evaluate
     * @param amount - The USDC amount to deposit (6 decimals, as string)
     * @returns Pool evaluation with risk metrics, score, and decision
     * 
     * @example
     * ```typescript
     * const evaluation = await agent.evaluatePool(discoveredPool, '1000000');
     * console.log(evaluation.score);    // 85
     * console.log(evaluation.decision); // 'execute'
     * console.log(evaluation.eligible); // true
     * ```
     */
    async evaluatePool(pool: DiscoveredPool, amount: string): Promise<PoolEvaluation> {
        console.log(`[SettleAgent] Evaluating pool ${pool.poolId.slice(0, 10)}... (${pool.feePercent} fee)`);

        // Build simulation parameters for this pool
        const simulationParams: SimulationParams = {
            sourceChain: 'base',
            hubChain: 'arc',
            destChain: 'unichain',
            poolId: pool.poolId,
            amountIn: amount,
            tokenIn: 'USDC',
            tokenOut: 'USDC',
        };

        // Run risk simulation
        const risk = await this.simulator.simulate(simulationParams);

        // Make decision based on risk metrics
        const decision = this.makeDecision(risk);

        // Calculate score and determine eligibility
        const { score, reasons, eligible } = this.scorePool(pool, risk);

        console.log(`[SettleAgent]   Liquidity: ${pool.liquidityDepth}, Slippage: ${(risk.slippage_p95 * 100).toFixed(2)}%, Impact: ${(risk.price_impact * 100).toFixed(2)}%`);
        console.log(`[SettleAgent]   Score: ${score}/100, Decision: ${decision}, Eligible: ${eligible}`);

        return {
            pool,
            risk,
            decision,
            score,
            reasons,
            eligible,
        };
    }

    /**
     * Discover pools and select the best one based on policy criteria.
     * 
     * This method:
     * 1. Discovers all ETH/USDC pools on the target chain
     * 2. Filters to initialized pools only
     * 3. Evaluates each pool (runs risk simulation, scores)
     * 4. Selects the highest-scoring eligible pool
     * 
     * @param amount - The USDC amount to deposit (6 decimals, as string)
     * @returns Pool selection result with the best pool and all evaluations
     * 
     * @example
     * ```typescript
     * const selection = await agent.selectPool('1000000');
     * if (selection.selectedPool) {
     *     console.log(`Selected: ${selection.selectedPool.feePercent} fee pool`);
     *     console.log(`Score: ${selection.allEvaluations[0].score}/100`);
     * }
     * ```
     */
    async selectPool(amount: string): Promise<PoolSelectionResult> {
        console.log(`[SettleAgent] Discovering pools for ${amount} USDC deposit...`);

        // 1. Discover all ETH/USDC pools on the target chain
        const pools = await discoverEthUsdcPools(this.chainKey);
        const initializedPools = pools.filter(p => p.initialized);

        console.log(`[SettleAgent] Found ${pools.length} total pools, ${initializedPools.length} initialized`);

        if (initializedPools.length === 0) {
            return {
                selectedPool: null,
                poolKey: null,
                allEvaluations: [],
                selectionReason: 'No initialized ETH/USDC pools found on chain',
            };
        }

        // 2. Evaluate each initialized pool
        const evaluations: PoolEvaluation[] = [];
        for (const pool of initializedPools) {
            const evaluation = await this.evaluatePool(pool, amount);
            evaluations.push(evaluation);
        }

        // 3. Filter to eligible pools and sort by score (descending)
        const eligibleEvaluations = evaluations
            .filter(e => e.eligible)
            .sort((a, b) => b.score - a.score);

        // 4. Select the best eligible pool
        if (eligibleEvaluations.length === 0) {
            // No eligible pools - provide detailed reason
            const ineligibleReasons = evaluations
                .map(e => `${e.pool.feePercent}: ${e.reasons.filter(r => r.includes('ineligible') || r.includes('exceeds') || r.includes('below')).join(', ')}`)
                .join('; ');

            return {
                selectedPool: null,
                poolKey: null,
                allEvaluations: evaluations,
                selectionReason: `No pools meet eligibility criteria. ${ineligibleReasons}`,
            };
        }

        const bestEvaluation = eligibleEvaluations[0];
        console.log(`[SettleAgent] Selected pool: ${bestEvaluation.pool.feePercent} fee (score: ${bestEvaluation.score}/100)`);

        return {
            selectedPool: bestEvaluation.pool,
            poolKey: bestEvaluation.pool.poolKey,
            allEvaluations: evaluations,
            selectionReason: `Selected ${bestEvaluation.pool.feePercent} fee pool with score ${bestEvaluation.score}/100`,
        };
    }

    /**
     * Main entry point - Automatically discover, select, and execute liquidity deposit.
     * 
     * This method provides a streamlined interface that doesn't require a poolId:
     * 1. Discovers all ETH/USDC pools on the target chain
     * 2. Evaluates and scores each pool based on policy
     * 3. Selects the best eligible pool
     * 4. Executes the liquidity deposit
     * 
     * Use this method when you want the agent to autonomously select the optimal pool.
     * Use `evaluateAndExecute()` when you have a specific pool in mind.
     * 
     * @param amount - The USDC amount to deposit (6 decimals, as string)
     * @param recipient - Optional LP token recipient address (defaults to sender)
     * @returns Execution result with status, risk metrics, and optional transaction details
     * 
     * @example
     * ```typescript
     * // Agent automatically selects the best pool
     * const result = await agent.selectAndExecute('5000000', recipientAddress);
     * 
     * console.log(result.status);     // 'completed' | 'aborted' | 'failed'
     * console.log(result.txHash);     // Transaction hash if successful
     * console.log(result.positionId); // NFT position ID if successful
     * ```
     */
    async selectAndExecute(amount: string, recipient?: string): Promise<ExecutionResult> {
        console.log(`[SettleAgent] Starting autonomous pool selection for ${amount} USDC deposit...`);

        // 1. Discover and select the best pool
        const selection = await this.selectPool(amount);

        // 2. Check if a suitable pool was found
        if (!selection.selectedPool || !selection.poolKey) {
            console.log(`[SettleAgent] Pool selection failed: ${selection.selectionReason}`);
            return {
                status: 'aborted',
                reason: selection.selectionReason,
                risk: this.getDefaultRisk(),
                timestamp: Date.now(),
            };
        }

        console.log(`[SettleAgent] Pool selected: ${selection.selectedPool.feePercent} fee`);
        console.log(`[SettleAgent] Pool ID: ${selection.selectedPool.poolId}`);

        // 3. Build intent with selected pool
        const intent: DepositLiquidityIntent = {
            poolId: selection.selectedPool.poolId,
            amount,
            recipient,
        };

        // 4. Execute with the selected pool
        return this.evaluateAndExecute(intent, selection.poolKey);
    }

    /**
     * Get default risk metrics for cases where simulation cannot be run.
     * Used when aborting due to no eligible pools.
     */
    private getDefaultRisk(): RiskMetrics {
        return {
            finality_delay_p50: 0,
            finality_delay_p95: 0,
            capital_at_risk_seconds: 0,
            slippage_p50: 0,
            slippage_p95: 0,
            price_impact: 0,
            pool_liquidity_depth: 'none',
            execution_confidence: 0,
            recommended_action: 'abort',
        };
    }

    /**
     * Score a pool based on multiple factors and policy thresholds.
     * 
     * Scoring algorithm weighs:
     * 1. Fee tier preference (0-25 points)
     * 2. Liquidity depth (0-30 points penalty)
     * 3. Slippage (0-20 points penalty)
     * 4. Price impact (0-15 points penalty)
     * 5. Execution confidence bonus (0-10 points)
     * 
     * @param pool - The discovered pool to score
     * @param risk - Risk metrics from simulation
     * @returns Score (0-100), reasons array, and eligibility flag
     */
    private scorePool(
        pool: DiscoveredPool,
        risk: RiskMetrics
    ): { score: number; reasons: string[]; eligible: boolean } {
        let score = 100;
        const reasons: string[] = [];
        let eligible = true;

        // Get liquidity policy if available, otherwise use base policy checks
        const liquidityPolicy = this.policy as Partial<LiquidityPolicy>;

        // 1. Fee tier preference (0-25 points penalty)
        if (liquidityPolicy.preferred_fee_tiers?.length) {
            const feeIndex = liquidityPolicy.preferred_fee_tiers.indexOf(pool.poolKey.fee);
            if (feeIndex === 0) {
                reasons.push(`Preferred fee tier (${pool.feePercent})`);
            } else if (feeIndex > 0) {
                const penalty = feeIndex * 5;
                score -= penalty;
                reasons.push(`Fee tier ${pool.feePercent} is preference #${feeIndex + 1} (-${penalty})`);
            } else {
                score -= 15;
                reasons.push(`Fee tier ${pool.feePercent} not in preferred list (-15)`);
            }
        }

        // Check fee tier bounds
        if (liquidityPolicy.max_fee_tier && pool.poolKey.fee > liquidityPolicy.max_fee_tier) {
            eligible = false;
            reasons.push(`Fee tier ${pool.feePercent} exceeds maximum`);
        }
        if (liquidityPolicy.min_fee_tier && pool.poolKey.fee < liquidityPolicy.min_fee_tier) {
            eligible = false;
            reasons.push(`Fee tier ${pool.feePercent} below minimum`);
        }

        // 2. Liquidity depth (0-30 points penalty)
        switch (pool.liquidityDepth) {
            case 'deep':
                reasons.push('Deep liquidity (+0)');
                break;
            case 'moderate':
                score -= 15;
                reasons.push('Moderate liquidity (-15)');
                break;
            case 'shallow':
                score -= 30;
                reasons.push('Shallow liquidity (-30)');
                break;
            case 'none':
                score -= 50;
                eligible = false;
                reasons.push('No liquidity (-50, ineligible)');
                break;
        }

        // Check minimum liquidity threshold
        if (liquidityPolicy.min_liquidity !== undefined && pool.liquidity < liquidityPolicy.min_liquidity) {
            eligible = false;
            reasons.push(`Liquidity ${pool.liquidity} below minimum ${liquidityPolicy.min_liquidity}`);
        }

        // 3. Slippage (0-20 points penalty)
        if (risk.slippage_p95 > 0.03) {
            score -= 20;
            reasons.push(`High slippage ${(risk.slippage_p95 * 100).toFixed(2)}% (-20)`);
        } else if (risk.slippage_p95 > 0.01) {
            score -= 10;
            reasons.push(`Moderate slippage ${(risk.slippage_p95 * 100).toFixed(2)}% (-10)`);
        } else {
            reasons.push(`Low slippage ${(risk.slippage_p95 * 100).toFixed(2)}% (+0)`);
        }

        // Check policy slippage threshold
        if (risk.slippage_p95 > this.policy.max_slippage) {
            eligible = false;
            reasons.push(`Slippage exceeds policy max ${(this.policy.max_slippage * 100).toFixed(2)}%`);
        }

        // 4. Price impact (0-15 points penalty)
        if (risk.price_impact > 0.02) {
            score -= 15;
            reasons.push(`High price impact ${(risk.price_impact * 100).toFixed(2)}% (-15)`);
        } else if (risk.price_impact > 0.005) {
            score -= 7;
            reasons.push(`Moderate price impact ${(risk.price_impact * 100).toFixed(2)}% (-7)`);
        } else {
            reasons.push(`Low price impact ${(risk.price_impact * 100).toFixed(2)}% (+0)`);
        }

        // Check policy price impact threshold
        if (risk.price_impact > this.policy.max_price_impact) {
            eligible = false;
            reasons.push(`Price impact exceeds policy max ${(this.policy.max_price_impact * 100).toFixed(2)}%`);
        }

        // 5. Execution confidence bonus (0-10 points)
        const confidenceBonus = Math.floor(risk.execution_confidence * 10);
        score += confidenceBonus;
        reasons.push(`Execution confidence ${(risk.execution_confidence * 100).toFixed(0)}% (+${confidenceBonus})`);

        // Check policy confidence threshold
        if (risk.execution_confidence < this.policy.min_confidence) {
            eligible = false;
            reasons.push(`Confidence below policy min ${(this.policy.min_confidence * 100).toFixed(0)}%`);
        }

        // 6. Pool must be initialized
        if (!pool.initialized) {
            eligible = false;
            score = 0;
            reasons.push('Pool not initialized (ineligible)');
        }

        // Clamp score to 0-100
        score = Math.max(0, Math.min(100, score));

        return { score, reasons, eligible };
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
