// packages/sdk/src/simulators/RiskSimulator.ts
// Risk Simulator for cross-chain transfer risk assessment

import {
    RiskMetrics,
    PoolRisk,
    SimulationParams,
} from '../types/risk';
import {
    getPoolState,
    estimateSlippage,
    calculatePriceImpact as calculatePoolPriceImpact,
    type PoolState,
} from '../utils/pool-utils';
import { type ChainKey } from '../config/networks';

// Arc latency distribution based on observed CCTP timing patterns
// Base estimate: 20s (from ArcTransferLeg.ts line 47)
// Attestation polling interval: 2s (from ArcTransferLeg.ts line 122)
const ARC_LATENCY = {
    p50: 15,  // seconds
    p95: 45,  // seconds
    p99: 90,  // seconds
} as const;

// Scenario multipliers for risk estimation
const SCENARIO_MULTIPLIERS = {
    optimistic: { latency: 0.7, slippage: 0.5 },
    default: { latency: 1.0, slippage: 1.0 },
    pessimistic: { latency: 1.5, slippage: 2.0 },
} as const;

// Thresholds for recommendation logic
const THRESHOLDS = {
    // Slippage thresholds
    slippage: {
        acceptable: 0.01,  // 1% - acceptable slippage
        warning: 0.03,     // 3% - warning level
        critical: 0.05,    // 5% - abort recommended
    },
    // Price impact thresholds
    priceImpact: {
        acceptable: 0.005, // 0.5%
        warning: 0.02,     // 2%
        critical: 0.05,    // 5%
    },
    // Confidence thresholds
    confidence: {
        high: 0.8,         // High confidence to execute
        medium: 0.5,       // Medium confidence to wait
    },
    // Liquidity thresholds (in base units)
    liquidity: {
        deep: 10n ** 18n * 1000000n,      // 1M units
        moderate: 10n ** 18n * 100000n,   // 100K units
        shallow: 10n ** 18n * 10000n,     // 10K units
    },
} as const;

export type Scenario = 'optimistic' | 'default' | 'pessimistic';

export interface ArcLatencyEstimate {
    p50: number;
    p95: number;
    p99: number;
    capitalAtRiskSeconds: number;
}

/**
 * RiskSimulator class for assessing cross-chain transfer risks
 * Combines Arc network latency estimation with Uniswap pool analysis
 */
export class RiskSimulator {
    private chainKey: ChainKey;

    constructor(chainKey: ChainKey = 'unichainSepolia') {
        this.chainKey = chainKey;
    }

    /**
     * Main entry point - simulates a cross-chain transfer and returns risk metrics
     * 
     * @param params - Simulation parameters including pool ID, amount, and scenario
     * @returns Complete risk metrics with recommendations
     */
    async simulate(params: SimulationParams): Promise<RiskMetrics> {
        const scenario = params.scenario || 'default';

        // Run Arc latency estimation and pool analysis in parallel
        const [arcLatency, poolRisk] = await Promise.all([
            this.estimateArcTransfer(scenario),
            this.analyzeUniswapPool(params.poolId as `0x${string}`, params.amountIn, scenario),
        ]);

        // Calculate execution confidence
        const executionConfidence = this.calculateConfidence(poolRisk);

        // Get recommended action
        const recommendedAction = this.recommend(poolRisk, executionConfidence);

        return {
            finality_delay_p50: arcLatency.p50,
            finality_delay_p95: arcLatency.p95,
            capital_at_risk_seconds: arcLatency.capitalAtRiskSeconds,
            slippage_p50: poolRisk.slippage_median,
            slippage_p95: poolRisk.slippage_worst,
            price_impact: poolRisk.impact,
            pool_liquidity_depth: poolRisk.liquidity,
            execution_confidence: executionConfidence,
            recommended_action: recommendedAction,
        };
    }

    /**
     * Estimates Arc network transfer latency based on scenario
     * Leverages observed CCTP attestation timing patterns
     * 
     * @param scenario - Risk scenario (optimistic/default/pessimistic)
     * @returns Latency estimates at different percentiles
     */
    async estimateArcTransfer(scenario: Scenario = 'default'): Promise<ArcLatencyEstimate> {
        const multiplier = SCENARIO_MULTIPLIERS[scenario].latency;

        const p50 = Math.round(ARC_LATENCY.p50 * multiplier);
        const p95 = Math.round(ARC_LATENCY.p95 * multiplier);
        const p99 = Math.round(ARC_LATENCY.p99 * multiplier);

        // Capital at risk is the time funds are locked during transfer
        // Use p95 as a conservative estimate for capital planning
        const capitalAtRiskSeconds = p95;

        return {
            p50,
            p95,
            p99,
            capitalAtRiskSeconds,
        };
    }

    /**
     * Analyzes Uniswap pool state and calculates risk metrics
     * 
     * @param poolId - The Uniswap v4 pool ID
     * @param amountIn - Trade amount as string
     * @param scenario - Risk scenario for slippage multipliers
     * @returns Pool risk assessment
     */
    async analyzeUniswapPool(
        poolId: `0x${string}`,
        amountIn: string,
        scenario: Scenario = 'default'
    ): Promise<PoolRisk> {
        try {
            // Fetch pool state from Unichain
            const poolState = await getPoolState(poolId, this.chainKey);

            // Calculate slippage estimates
            const baseSlippage = this.calculateSlippage(poolState, amountIn, 'p50');
            const worstSlippage = this.calculateSlippage(poolState, amountIn, 'p95');

            // Apply scenario multiplier to slippage
            const slippageMultiplier = SCENARIO_MULTIPLIERS[scenario].slippage;

            // Calculate price impact
            const priceImpact = this.calculatePriceImpact(poolState, amountIn);

            // Assess liquidity depth
            const liquidityDepth = this.assessLiquidityDepth(poolState.liquidity);

            return {
                liquidity: liquidityDepth,
                slippage_median: baseSlippage * slippageMultiplier,
                slippage_worst: worstSlippage * slippageMultiplier,
                impact: priceImpact,
            };
        } catch (error) {
            // Return conservative estimates if pool query fails
            console.warn(`Failed to analyze pool ${poolId}:`, error);
            return this.getConservativePoolRisk();
        }
    }

    /**
     * Calculate slippage estimate at a given percentile
     * 
     * @param poolState - Current pool state
     * @param amountIn - Trade amount
     * @param percentile - Target percentile (p50 or p95)
     * @returns Slippage as decimal (e.g., 0.01 for 1%)
     */
    private calculateSlippage(
        poolState: PoolState,
        amountIn: string,
        percentile: 'p50' | 'p95'
    ): number {
        const baseSlippage = estimateSlippage(
            poolState.liquidity,
            amountIn,
            poolState.sqrtPriceX96
        );

        // Apply percentile multiplier
        // p95 slippage is typically ~2x p50 due to market volatility
        const percentileMultiplier = percentile === 'p95' ? 2.0 : 1.0;

        return baseSlippage * percentileMultiplier;
    }

    /**
     * Calculate price impact for the trade
     * 
     * @param poolState - Current pool state
     * @param amountIn - Trade amount
     * @returns Price impact as decimal
     */
    private calculatePriceImpact(poolState: PoolState, amountIn: string): number {
        return calculatePoolPriceImpact(
            poolState.liquidity,
            amountIn,
            poolState.sqrtPriceX96
        );
    }

    /**
     * Calculate execution confidence score based on pool risk
     * 
     * @param poolRisk - Pool risk assessment
     * @returns Confidence score from 0 to 1
     */
    calculateConfidence(poolRisk: PoolRisk): number {
        let confidence = 1.0;

        // Reduce confidence based on liquidity depth
        switch (poolRisk.liquidity) {
            case 'deep':
                confidence *= 1.0;
                break;
            case 'moderate':
                confidence *= 0.8;
                break;
            case 'shallow':
                confidence *= 0.5;
                break;
            default:
                confidence *= 0.3;
        }

        // Reduce confidence based on slippage
        if (poolRisk.slippage_worst >= THRESHOLDS.slippage.critical) {
            confidence *= 0.3;
        } else if (poolRisk.slippage_worst >= THRESHOLDS.slippage.warning) {
            confidence *= 0.6;
        } else if (poolRisk.slippage_worst >= THRESHOLDS.slippage.acceptable) {
            confidence *= 0.9;
        }

        // Reduce confidence based on price impact
        if (poolRisk.impact >= THRESHOLDS.priceImpact.critical) {
            confidence *= 0.3;
        } else if (poolRisk.impact >= THRESHOLDS.priceImpact.warning) {
            confidence *= 0.7;
        } else if (poolRisk.impact >= THRESHOLDS.priceImpact.acceptable) {
            confidence *= 0.95;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Recommend action based on pool risk and confidence
     * 
     * @param poolRisk - Pool risk assessment
     * @param confidence - Execution confidence score
     * @returns Recommended action: execute, wait, or abort
     */
    recommend(poolRisk: PoolRisk, confidence?: number): 'execute' | 'wait' | 'abort' {
        const effectiveConfidence = confidence ?? this.calculateConfidence(poolRisk);

        // Abort conditions - high risk scenarios
        if (poolRisk.slippage_worst >= THRESHOLDS.slippage.critical) {
            return 'abort';
        }

        if (poolRisk.impact >= THRESHOLDS.priceImpact.critical) {
            return 'abort';
        }

        if (poolRisk.liquidity === 'shallow') {
            return 'abort';
        }

        // Wait conditions - moderate risk scenarios
        if (effectiveConfidence < THRESHOLDS.confidence.medium) {
            return 'abort';
        }

        if (effectiveConfidence < THRESHOLDS.confidence.high) {
            return 'wait';
        }

        if (poolRisk.slippage_worst >= THRESHOLDS.slippage.warning) {
            return 'wait';
        }

        if (poolRisk.impact >= THRESHOLDS.priceImpact.warning) {
            return 'wait';
        }

        // Execute - low risk scenarios
        return 'execute';
    }

    /**
     * Assess liquidity depth category from raw liquidity value
     */
    private assessLiquidityDepth(liquidity: bigint): 'deep' | 'moderate' | 'shallow' {
        if (liquidity >= THRESHOLDS.liquidity.deep) return 'deep';
        if (liquidity >= THRESHOLDS.liquidity.moderate) return 'moderate';
        return 'shallow';
    }

    /**
     * Return conservative pool risk when actual data is unavailable
     */
    private getConservativePoolRisk(): PoolRisk {
        return {
            liquidity: 'shallow',
            slippage_median: THRESHOLDS.slippage.warning,
            slippage_worst: THRESHOLDS.slippage.critical,
            impact: THRESHOLDS.priceImpact.warning,
        };
    }

    /**
     * Static factory method for quick simulations
     */
    static async quickSimulate(params: SimulationParams): Promise<RiskMetrics> {
        const simulator = new RiskSimulator();
        return simulator.simulate(params);
    }
}

export default RiskSimulator;
