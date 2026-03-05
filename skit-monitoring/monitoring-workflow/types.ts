export type MonitoringStatus = "HEALTHY" | "MOVE_RECOMMENDED";

export interface MonitoringWorkflowConfig {
  schedule: string;
  backendUrl: string;
  webhookUrl: string;
  targetRpc: string;
  poolManagerAddress: `0x${string}`;
  liquidityThreshold: string;
  /** @deprecated Pool list now from discovery (same ETH/USDC set as risk-guard). Kept for backward compatibility. */
  poolRegistry?: `0x${string}`[];
}

export interface ActivePosition {
  positionId: string;
  poolAddress: `0x${string}`;
  depositAmount: string;
  chain: string;
  rpcUrl?: string;
}

export interface PoolHealth {
  poolId: `0x${string}`;
  initialized: boolean;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
}

export interface MonitoringDecision {
  status: MonitoringStatus;
  reason: string;
  nextBestPool?: `0x${string}`;
  nextBestLiquidity?: string;
}

export interface MonitoringReport {
  reportId: string;
  positionId: string;
  poolAddress: `0x${string}`;
  depositAmount: string;
  currentLiquidity: string;
  status: MonitoringStatus;
  nextBestPool?: `0x${string}`;
  nextBestLiquidity?: string;
  reason: string;
  chain: string;
  timestamp: number;
  metadata?: {
    workflow: string;
    webhookUrl?: string;
  };
}

export interface MonitoringWebhookPayload {
  event: "MONITORING_REPORT";
  report: MonitoringReport;
  sentAt: number;
}
