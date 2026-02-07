import type { RiskMetrics } from './risk';
import type { DiscoveredPool, PoolKey } from '../utils/pool-discovery';

/**
 * Policy configuration for the SettleAgent decision engine.
 * Defines thresholds and behavior for automated liquidity execution.
 */
export interface AgentPolicy {
  /** Maximum acceptable slippage (e.g., 0.01 = 1%) */
  max_slippage: number;

  /** Maximum acceptable latency in seconds (e.g., 300 = 5min) */
  max_latency_seconds: number;

  /** Maximum acceptable price impact (e.g., 0.02 = 2%) */
  max_price_impact: number;

  /** Minimum required execution confidence (e.g., 0.80 = 80%) */
  min_confidence: number;

  /** Number of retry attempts before final abort */
  retry_attempts: number;

  /** Delay between retries in seconds */
  retry_delay_seconds: number;

  /** Strategy when conditions are not met */
  fallback_strategy: 'abort' | 'wait' | 'split_order';
}

/**
 * Intent for depositing liquidity to a Uniswap v4 pool.
 * Represents the user's desired action before risk evaluation.
 */
export interface DepositLiquidityIntent {
  /** Uniswap v4 pool ID */
  poolId: string;

  /** USDC amount to deposit (6 decimals, as string for precision) */
  amount: string;

  /** Optional: concentrated liquidity lower tick bound */
  tickLower?: number;

  /** Optional: concentrated liquidity upper tick bound */
  tickUpper?: number;

  /** LP token recipient address (defaults to sender if not specified) */
  recipient?: string;
}

/**
 * Agent decision output from risk evaluation.
 */
export type AgentDecision = 'execute' | 'wait' | 'abort';

/**
 * Result of an execution attempt by the SettleAgent.
 */
export interface ExecutionResult {
  /** Final status of the execution */
  status: 'completed' | 'aborted' | 'failed';

  /** Transaction hash if execution was attempted */
  txHash?: string;

  /** Reason for abort or failure */
  reason?: string;

  /** Risk metrics at time of execution/decision */
  risk: RiskMetrics;

  /** Unix timestamp of the result */
  timestamp: number;

  /** Uniswap v4 position NFT ID if liquidity was deposited */
  positionId?: string;
}

/**
 * Log entry for agent decision history.
 * Used for audit, compliance, and transparency requirements.
 */
export interface ExecutionLog {
  /** Unix timestamp of the decision */
  timestamp: number;

  /** Decision made by the agent */
  decision: AgentDecision;

  /** Risk metrics that informed the decision */
  risk: RiskMetrics;

  /** Policy configuration at time of decision */
  policy: AgentPolicy;

  /** Original intent being evaluated */
  intent: DepositLiquidityIntent;

  /** Current retry count (if applicable) */
  retryCount?: number;
}

// =============================================================================
// Liquidity Policy & Pool Selection Types
// =============================================================================

/**
 * Extended policy for pool selection and liquidity provision.
 * Includes criteria for choosing optimal pools.
 */
export interface LiquidityPolicy extends AgentPolicy {
  /** Minimum pool liquidity in raw units (e.g., 10n ** 18n for 1 token unit) */
  min_liquidity: bigint;

  /** Preferred fee tiers in order of preference (e.g., [3000, 500, 10000]) */
  preferred_fee_tiers: number[];

  /** Maximum acceptable fee tier (e.g., 10000 for 1%) */
  max_fee_tier: number;

  /** Minimum acceptable fee tier (e.g., 100 for 0.01%) */
  min_fee_tier: number;

  /** Preferred tick range width for concentrated liquidity */
  tick_range_width: number;

  /** Position type: 'one_sided_usdc' | 'one_sided_eth' | 'balanced' */
  position_type: 'one_sided_usdc' | 'one_sided_eth' | 'balanced';
}

/**
 * Evaluation result for a single pool candidate
 */
export interface PoolEvaluation {
  /** The discovered pool being evaluated */
  pool: DiscoveredPool;

  /** Risk metrics from simulation */
  risk: RiskMetrics;

  /** Agent decision based on evaluation */
  decision: AgentDecision;

  /** Score from 0-100, higher is better */
  score: number;

  /** Reasons explaining the score */
  reasons: string[];

  /** Whether the pool passes minimum thresholds */
  eligible: boolean;
}

/**
 * Result of pool selection process
 */
export interface PoolSelectionResult {
  /** The selected pool, or null if none eligible */
  selectedPool: DiscoveredPool | null;

  /** The pool key for the selected pool */
  poolKey: PoolKey | null;

  /** Evaluations for all candidate pools */
  allEvaluations: PoolEvaluation[];

  /** Reason for the selection decision */
  selectionReason: string;
}
