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
