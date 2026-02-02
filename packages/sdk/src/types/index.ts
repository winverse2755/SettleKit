import { Address, Hash } from 'viem';

// Intent - what user wants
export interface SettleIntent {
  asset: 'USDC';
  amount: string;
  sourceChain: 'base' | 'arc' | 'unichain';
  destinationChain: 'unichain' | 'arc';
  finalAction: {
    type: 'supply' | 'swap' | 'stake';
    protocol: 'morpho' | 'uniswap';
    params: Record<string, unknown>;
  };
  // Agent-specific (for Uniswap prize)
  executionPolicy?: {
    maxSlippage: number;
    maxLatency: number;
    fallbackStrategy: 'revert' | 'retry' | 'reroute';
  };
}

// ExecutionPlan - deterministic settlement path
export interface ExecutionPlan {
  id: string;
  legs: Leg[];
  deterministicOrder: true; // SettleKit guarantee
  settlementGraph: string; // Mermaid diagram
  riskProfile?: RiskReport;
}

// Leg estimate returned before execution
export interface LegEstimate {
  estimatedTime: number; // seconds
  gasEstimate: bigint;
  confidence: number; // 0-1
  expectedOutput?: string;
  priceImpact?: number;
}

// Leg receipt after execution
export interface LegReceipt {
  legId: string;
  txHash: Hash;
  status: 'completed' | 'failed' | 'pending';
  amountOut?: string;
  attestation?: string; // For Circle transfers
}

// Risk report from simulation
export interface RiskReport {
  finality_delay_p50: number; // median latency (seconds)
  finality_delay_p95: number; // 95th percentile latency
  capital_at_risk_seconds: number; // how long funds are locked
  atomicity: 'atomic' | 'non-atomic';
  reversibleLegs: string[]; // which legs can be rolled back
  terminalLegs: string[]; // which legs cannot be reversed
  crossChainEfficiency?: number; // Arc-specific
  fragmentationScore?: number; // Arc-specific
  slippage_p95?: number;
}

// Rollback strategy for failed legs
export interface RollbackStrategy {
  canRollback: boolean;
  rollbackSteps: string[];
  estimatedCost: bigint;
}

// Abstract Leg class - base for all settlement steps
export abstract class Leg {
  public id: string;
  public type: string;
  
  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
  }
  
  abstract estimate(): Promise<LegEstimate>;
  abstract execute(signer: any): Promise<LegReceipt>;
  abstract verify(txHash: Hash): Promise<boolean>;
  abstract getRollbackStrategy(): RollbackStrategy | null;
}

// Chain type
export type Chain = 'base' | 'arc' | 'unichain';

// Signer type (we'll use viem's WalletClient later)
export type Signer = any; // Will replace with proper viem type