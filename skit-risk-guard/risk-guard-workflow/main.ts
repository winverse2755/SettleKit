// skit-risk-guard/risk-guard-workflow/main.ts
// CRE Risk Guard Workflow - Complete risk assessment for cross-chain settlements
// Workflow: HTTP trigger → data fetches → threshold evaluation → emit report

import {
  HTTPCapability,
  handler,
  Runner,
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk";
import type {
  SettlementIntent,
  WorkflowConfig,
  RiskReport,
  OracleData,
  PoolData,
  BridgeData,
} from "./types";
import { fetchOracleData } from "./fetchers/oracle";
import { fetchPoolData } from "./fetchers/pool";
import { fetchBridgeData } from "./fetchers/bridge";
import {
  evaluateRisk,
  determineStatus,
  buildReport,
  getSummary,
} from "./evaluator";
import {
  emitReport,
  getEmissionTargets,
} from "./emitter";

/**
 * Main HTTP trigger handler for complete risk assessment.
 * 
 * Workflow steps:
 * 1. Ingest Settlement Intent (HTTP trigger)
 * 2. Fetch Oracle Data (Chainlink Data Feeds via EVMClient)
 * 3. Fetch Pool Health (Uniswap v4 via HTTP eth_call → Tenderly RPC)  // Unichain not supported by CRE yet so cant use EVMClient
 * 4. Fetch Bridge Status (Circle CCTP API via HTTPClient)
 * 5. Evaluate Risk Thresholds
 * 6. Emit Risk Report (webhook or executor signal)
 */
const onHttpTrigger = (
  runtime: Runtime<WorkflowConfig>,
  payload: HTTPPayload
): RiskReport => {
  const executionId = `risk-${Date.now()}`;
  const fetchErrors: string[] = [];

  runtime.log("=".repeat(60));
  runtime.log("CRE Risk Guard Workflow - Starting risk assessment");
  runtime.log(`Execution ID: ${executionId}`);
  runtime.log(`Emission targets: ${getEmissionTargets(runtime.config)}`);
  runtime.log("=".repeat(60));

  // ============================================================
  // Step 1: Parse Settlement Intent from HTTP payload
  // ============================================================
  runtime.log("\n[Step 1] Parsing settlement intent...");

  if (!payload.input || payload.input.length === 0) {
    runtime.log("ERROR: HTTP trigger payload is empty");
    return createErrorReport("Empty request payload", executionId);
  }

  let intent: SettlementIntent;
  try {
    intent = decodeJson(payload.input) as SettlementIntent;
    runtime.log(`Settlement intent received:`);
    runtime.log(`  Token: ${intent.token}`);
    runtime.log(`  Amount: ${intent.amount}`);
    runtime.log(`  Route: ${intent.sourceChain} -> ${intent.targetChain}`);
    runtime.log(`  Max slippage: ${(intent.maxSlippageTolerance * 100).toFixed(2)}%`);
    runtime.log(`  Max bridge delay: ${intent.maxBridgeDelay}ms`);
  } catch (error) {
    runtime.log("ERROR: Failed to parse settlement intent");
    return createErrorReport("Invalid JSON payload", executionId);
  }

  // Validate required fields
  if (!intent.sourceChain || !intent.targetChain || !intent.amount) {
    runtime.log("ERROR: Missing required fields");
    return createErrorReport(
      "Missing required fields: sourceChain, targetChain, amount",
      executionId
    );
  }

  // ============================================================
  // Step 2: Fetch Oracle Data (Chainlink Data Feeds)
  // ============================================================
  runtime.log("\n[Step 2] Fetching oracle data from Chainlink Data Feeds...");
  let oracleData: OracleData;
  try {
    oracleData = fetchOracleData(runtime);
    runtime.log(`  ETH/USD: $${Number(oracleData.ethUsdPrice) / 1e8}`);
    runtime.log(`  USDC/USD: $${Number(oracleData.usdcUsdPrice) / 1e8}`);
    runtime.log(`  Timestamp: ${oracleData.timestamp}`);
  } catch (error) {
    const errorMsg = `Oracle fetch failed: ${error}`;
    runtime.log(`  ERROR: ${errorMsg}`);
    fetchErrors.push(errorMsg);
    oracleData = {
      ethUsdPrice: 0n,
      usdcUsdPrice: 0n,
      timestamp: 0,
    };
  }

  // ============================================================
  // Step 3: Fetch Pool Health (Uniswap v4 via HTTP eth_call → Tenderly RPC)
  // ============================================================
  runtime.log("\n[Step 3] Fetching pool health data via Tenderly RPC (HTTP eth_call)...");
  let poolData: PoolData;
  try {
    poolData = fetchPoolData(runtime, intent);
    runtime.log(`  Liquidity: ${poolData.liquidity.toString()}`);
    runtime.log(`  Liquidity depth: ${poolData.liquidityDepth}`);
    runtime.log(`  Current tick: ${poolData.tick}`);
    runtime.log(`  LP fee: ${poolData.lpFee / 10000}%`);
  } catch (error) {
    const errorMsg = `Pool fetch failed: ${error}`;
    runtime.log(`  ERROR: ${errorMsg}`);
    fetchErrors.push(errorMsg);
    poolData = {
      sqrtPriceX96: 0n,
      tick: 0,
      liquidity: 0n,
      liquidityDepth: "shallow" as const,
      lpFee: 0,
    };
  }

  // ============================================================
  // Step 4: Fetch Bridge Status (Circle CCTP API)
  // ============================================================
  runtime.log("\n[Step 4] Fetching bridge status from CCTP API...");
  let bridgeData: BridgeData;
  try {
    bridgeData = fetchBridgeData(runtime, intent);
    runtime.log(`  Attestation status: ${bridgeData.attestationStatus}`);
    runtime.log(`  Estimated confirmation: ${bridgeData.estimatedConfirmationMs}ms`);
    if (bridgeData.queuePosition !== undefined) {
      runtime.log(`  Queue position: ${bridgeData.queuePosition}`);
    }
  } catch (error) {
    const errorMsg = `Bridge fetch failed: ${error}`;
    runtime.log(`  ERROR: ${errorMsg}`);
    fetchErrors.push(errorMsg);
    bridgeData = {
      attestationStatus: "unknown" as const,
      estimatedConfirmationMs: 900000, // Default 15 minutes
    };
  }

  // Log fetch summary
  if (fetchErrors.length > 0) {
    runtime.log(`\nFetch completed with ${fetchErrors.length} error(s)`);
  } else {
    runtime.log("\nAll data fetches completed successfully");
  }

  // ============================================================
  // Step 5: Evaluate Risk Thresholds
  // ============================================================
  runtime.log("\n[Step 5] Evaluating risk thresholds...");

  const checks = evaluateRisk(intent, oracleData, poolData, bridgeData, runtime.config);
  const status = determineStatus(checks);
  const summary = getSummary(status, checks);

  runtime.log(`\nRisk evaluation results:`);
  for (const check of checks) {
    const icon = check.passed ? "✓" : "✗";
    runtime.log(`  ${icon} ${check.name}: ${check.description}`);
    runtime.log(`    Actual: ${check.actual}, Threshold: ${check.threshold}, Severity: ${check.severity}`);
  }

  runtime.log(`\nStatus: ${status}`);
  runtime.log(`Summary: ${summary}`);

  // ============================================================
  // Step 6: Build and Emit Risk Report
  // ============================================================
  runtime.log("\n[Step 6] Building and emitting risk report...");

  const report = buildReport(
    status,
    checks,
    oracleData,
    poolData,
    intent,
    runtime.config,
    executionId
  );

  // Add fetch errors to report metadata if any
  if (fetchErrors.length > 0) {
    report.metadata = {
      ...report.metadata,
      notes: [...(report.metadata?.notes ?? []), ...fetchErrors],
    };
  }

  runtime.log(`  Recipe ID: ${report.recipeId}`);
  runtime.log(`  Explorer URL: ${report.explorerUrl}`);
  runtime.log(`  Tenderly sim success: ${report.tenderlySim.success}`);

  // Emit report based on status
  const emitResult = emitReport(runtime, report);
  if (emitResult.success) {
    runtime.log(`  Report emitted successfully`);
  } else {
    runtime.log(`  Report emission failed: ${emitResult.error}`);
  }

  runtime.log("\n" + "=".repeat(60));
  runtime.log(`Risk assessment complete - Status: ${status}`);
  runtime.log("=".repeat(60));

  return report;
};

/**
 * Creates an error report for early failures (parsing, validation).
 */
function createErrorReport(error: string, executionId: string): RiskReport {
  return {
    status: "BLOCKED",
    checks: [
      {
        name: "validation",
        passed: false,
        actual: error,
        threshold: "valid input",
        severity: "critical",
        description: `Validation failed: ${error}`,
      },
    ],
    oracleData: {
      ethUsdPrice: "0",
      usdcUsdPrice: "0",
      timestamp: 0,
    },
    tenderlySim: {
      success: false,
      gasEstimate: "0",
      expectedOutput: "0",
    },
    explorerUrl: "",
    recipeId: `error-${executionId}`,
    timestamp: Date.now(),
    intent: {
      sourceChain: "",
      targetChain: "",
      token: "",
      amount: "0",
      targetPoolAddress: "",
      maxSlippageTolerance: 0,
      maxBridgeDelay: 0,
      sourceRpc: "",
      targetRpc: "",
    },
    metadata: {
      executionId,
      notes: [error],
    },
  };
}

/**
 * Initializes the CRE workflow with HTTP trigger.
 */
const initWorkflow = (config: WorkflowConfig) => {
  const http = new HTTPCapability();

  // Build authorized keys from config
  const authorizedKeys = (config.authorizedKeys ?? []).map((key) => ({
    type: "KEY_TYPE_ECDSA_EVM" as const,
    publicKey: key,
  }));

  return [
    handler(
      http.trigger({
        authorizedKeys,
      }),
      onHttpTrigger
    ),
  ];
};

/**
 * Main entry point for the CRE workflow.
 */
export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>();
  await runner.run(initWorkflow);
}
