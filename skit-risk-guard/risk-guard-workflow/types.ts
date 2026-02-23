// skit-risk-guard/risk-guard-workflow/types.ts
// Type definitions for the CRE Risk Guard Workflow

/**
 * Settlement intent payload received via HTTP trigger.
 * Contains all parameters needed to assess risk for a cross-chain settlement.
 */
export interface SettlementIntent {
  /** Source chain identifier (e.g., "baseSepolia") */
  sourceChain: string;
  /** Target chain identifier (e.g., "unichainSepolia") */
  targetChain: string;
  /** Token symbol or address to transfer */
  token: string;
  /** Transfer amount in base units (wei) */
  amount: string;
  /** Target Uniswap v4 pool address/ID for liquidity check */
  targetPoolAddress: string;
  /** Maximum acceptable slippage as decimal (e.g., 0.01 for 1%) */
  maxSlippageTolerance: number;
  /** Maximum acceptable bridge delay in milliseconds */
  maxBridgeDelay: number;
  /** Tenderly fork RPC endpoint for source chain */
  sourceRpc: string;
  /** Tenderly fork RPC endpoint for target chain */
  targetRpc: string;
}

/**
 * Oracle price data fetched from Chainlink Data Feeds.
 */
export interface OracleData {
  /** ETH/USD price with 8 decimals */
  ethUsdPrice: bigint;
  /** USDC/USD price with 8 decimals */
  usdcUsdPrice: bigint;
  /** Block timestamp when prices were fetched */
  timestamp: number;
  /** Round ID from latest Chainlink update */
  roundId?: bigint;
}

/**
 * Pool health data from Uniswap v4 PoolManager.
 */
export interface PoolData {
  /** Current sqrt price as Q64.96 fixed point */
  sqrtPriceX96: bigint;
  /** Current tick (log base 1.0001 of price) */
  tick: number;
  /** Available liquidity in the active tick range */
  liquidity: bigint;
  /** Liquidity depth assessment */
  liquidityDepth: "deep" | "moderate" | "shallow";
  /** LP fee tier in basis points (e.g., 3000 = 0.3%) */
  lpFee: number;
  /** Protocol fee if any */
  protocolFee?: number;
}

/**
 * Bridge status data from Circle CCTP API.
 */
export interface BridgeData {
  /** Current attestation status */
  attestationStatus: "pending" | "complete" | "failed" | "unknown";
  /** Estimated time to confirmation in milliseconds */
  estimatedConfirmationMs: number;
  /** Position in attestation queue if available */
  queuePosition?: number;
  /** CCTP domain ID for source chain */
  sourceDomain?: number;
  /** CCTP domain ID for destination chain */
  destinationDomain?: number;
}

/**
 * Aggregated risk data returned by the workflow.
 * Contains all fetched data for downstream threshold evaluation.
 */
export interface RiskDataFetch {
  /** Oracle price data */
  oracle: OracleData;
  /** Pool health data */
  pool: PoolData;
  /** Bridge status data */
  bridge: BridgeData;
  /** Original settlement intent */
  intent: SettlementIntent;
  /** Fetch metadata */
  metadata: {
    /** Timestamp when data was fetched */
    fetchedAt: number;
    /** Whether all fetches succeeded */
    complete: boolean;
    /** Any errors encountered */
    errors?: string[];
  };
}

/**
 * Chainlink Data Feed addresses per chain.
 */
export interface ChainlinkFeedConfig {
  /** ETH/USD price feed address */
  ETH_USD: string;
  /** USDC/USD price feed address */
  USDC_USD: string;
  /** Additional feeds can be added here */
  [key: string]: string;
}

/**
 * Workflow configuration loaded from config.staging.json.
 */
export interface WorkflowConfig {
  /** Authorized wallet addresses for HTTP trigger */
  authorizedKeys: string[];
  /** Chainlink feed addresses by chain */
  chainlinkFeeds: {
    baseSepolia: ChainlinkFeedConfig;
    [chain: string]: ChainlinkFeedConfig;
  };
  /** Uniswap v4 PoolManager address */
  poolManagerAddress: string;
  /** Circle CCTP API base URL */
  cctpApiUrl: string;
  /** CCTP domain IDs for cross-chain messaging */
  cctpDomains?: {
    [chain: string]: number;
  };
}

/**
 * HTTP trigger response structure.
 */
export interface WorkflowResponse {
  /** Whether the workflow completed successfully */
  success: boolean;
  /** Risk data if successful */
  data?: RiskDataFetch;
  /** Error message if failed */
  error?: string;
  /** Workflow execution ID for tracing */
  executionId?: string;
}

/**
 * Chainlink AggregatorV3 latestRoundData response.
 */
export interface AggregatorRoundData {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
}

/**
 * CCTP API response for message status.
 */
export interface CCTPMessageStatus {
  status: string;
  attestation?: string;
  message?: string;
  eventNonce?: string;
  sourceDomain?: number;
  destinationDomain?: number;
}

/**
 * Risk threshold configuration for evaluation.
 */
export interface RiskThresholds {
  /** Maximum acceptable slippage */
  maxSlippage: number;
  /** Maximum acceptable price impact */
  maxPriceImpact: number;
  /** Minimum required liquidity depth */
  minLiquidityDepth: "deep" | "moderate" | "shallow";
  /** Maximum acceptable bridge delay in ms */
  maxBridgeDelayMs: number;
  /** Maximum price staleness in seconds */
  maxPriceStalenessSeconds: number;
}

/**
 * Risk evaluation result after threshold checks.
 */
export interface RiskEvaluation {
  /** Overall recommendation */
  action: "execute" | "wait" | "abort";
  /** Confidence score 0-1 */
  confidence: number;
  /** Individual check results */
  checks: {
    slippageOk: boolean;
    priceImpactOk: boolean;
    liquidityOk: boolean;
    bridgeDelayOk: boolean;
    priceFreshnessOk: boolean;
  };
  /** Human-readable summary */
  summary: string;
}
