import type { RiskMetrics } from './risk';

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
