// Qué tan riesgoso es un leg individual
export interface LegRisk {
    legName: string;
    failureProbability: number; // 0 → 1
    estimatedTimeMs: number;
    notes?: string;
}

// Riesgo agregado del plan completo
export interface RiskReport {
    totalFailureProbability: number;
    totalEstimatedTimeMs: number;

    legs: LegRisk[];

    summary: string; // texto explicativo para logs / UI / agentes
    score: number;   // 0 → 100 (más alto = más riesgoso)
}

// Risk Simulator Types

export interface RiskMetrics {
    finality_delay_p50: number;
    finality_delay_p95: number;
    capital_at_risk_seconds: number;
    slippage_p50: number;
    slippage_p95: number;
    price_impact: number;
    pool_liquidity_depth: string;
    execution_confidence: number;
    recommended_action: 'execute' | 'wait' | 'abort';
}

export interface PoolRisk {
    liquidity: string;
    slippage_median: number;
    slippage_worst: number;
    impact: number;
}

export interface SimulationParams {
    sourceChain: 'base';
    hubChain: 'arc';
    destChain: 'unichain';
    poolId: string;
    amountIn: string;
    tokenIn: string;
    tokenOut: string;
    scenario?: 'optimistic' | 'default' | 'pessimistic';
}
