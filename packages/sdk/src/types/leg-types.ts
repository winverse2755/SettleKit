// Qué tan caro y lento es este leg ANTES de ejecutarlo
export interface LegEstimate {
    gasEstimate: bigint;
    estimatedTimeMs: number;

    // Para el RiskReport global
    failureProbability: number; // 0 → 1
    notes?: string;
}

// Qué pasó DESPUÉS de ejecutar el leg
export interface LegReceipt {
    txHash: string;
    chain: string;

    success: boolean;

    // metadata útil para debugging / graph
    blockNumber?: number;
    logs?: unknown[];
}

export type RollbackStrategy =
    | { type: 'none' }
    | { type: 'retry'; maxRetries: number }
    | { type: 'compensate'; description: string };
