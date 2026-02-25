/**
 * Types for the SettleKit backend server
 * Mirrors types from skit-risk-guard/risk-guard-workflow/types.ts
 */

export interface SettlementIntent {
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: string;
  targetPoolAddress: string;
  maxSlippageTolerance: number;
  maxBridgeDelay: number;
  sourceRpc: string;
  targetRpc: string;
}

export type CheckSeverity = "info" | "warning" | "critical";
export type RiskStatus = "APPROVED" | "WARNING" | "BLOCKED";
export type SettlementStatus = "PENDING" | "APPROVED" | "WARNING" | "BLOCKED" | "EXECUTED" | "FAILED";

export interface RiskCheck {
  name: string;
  passed: boolean;
  actual: string | number;
  threshold: string | number;
  severity: CheckSeverity;
  description?: string;
}

export interface TenderlySim {
  success: boolean;
  gasEstimate: string;
  expectedOutput: string;
  vnetId?: string;
  txHash?: string;
}

export interface OracleDataReport {
  ethUsdPrice: string;
  usdcUsdPrice: string;
  timestamp: number;
}

export interface RiskReport {
  status: RiskStatus;
  checks: RiskCheck[];
  oracleData: OracleDataReport;
  tenderlySim: TenderlySim;
  explorerUrl: string;
  recipeId: string;
  timestamp: number;
  intent: SettlementIntent;
  metadata?: {
    executionId?: string;
    notes?: string[];
  };
}

export interface WebhookPayload {
  event: "RISK_REPORT";
  report: RiskReport;
  sentAt: number;
}

export interface ExecutorSignal {
  action: "EXECUTE";
  report: RiskReport;
  signalAt: number;
}

export interface Settlement {
  id: string;
  intent: SettlementIntent;
  status: SettlementStatus;
  riskReport?: RiskReport;
  txHash?: string;
  explorerUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SettlementRow {
  id: string;
  intent: string;
  status: string;
  risk_report: string | null;
  tx_hash: string | null;
  explorer_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface TriggerResponse {
  settlementId: string;
  status: SettlementStatus;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SettlementResponse {
  id: string;
  status: SettlementStatus;
  intent: SettlementIntent;
  riskReport?: RiskReport;
  execution?: {
    txHash: string;
    explorerUrl: string;
  };
  createdAt: number;
  updatedAt: number;
}
