// skit-risk-guard/risk-guard-workflow/main.ts
// CRE Risk Guard Workflow - Aggregates risk data for cross-chain settlements

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
  RiskDataFetch,
  WorkflowResponse,
} from "./types";
import { fetchOracleData } from "./fetchers/oracle";
import { fetchPoolData } from "./fetchers/pool";
import { fetchBridgeData } from "./fetchers/bridge";

/**
 * Main HTTP trigger handler for risk data aggregation.
 * Receives a settlement intent and fetches risk data from multiple sources:
 * 1. Oracle data (Chainlink Data Feeds via EVMClient)
 * 2. Pool health (Uniswap v4 via EVMClient with Tenderly fork)
 * 3. Bridge status (Circle CCTP API via HTTPClient)
 */
const onHttpTrigger = (
  runtime: Runtime<WorkflowConfig>,
  payload: HTTPPayload
): WorkflowResponse => {
  const fetchedAt = Date.now();
  const errors: string[] = [];

  // Parse settlement intent from HTTP payload
  if (!payload.input || payload.input.length === 0) {
    runtime.log("HTTP trigger payload is empty");
    return {
      success: false,
      error: "Empty request payload",
    };
  }

  let intent: SettlementIntent;
  try {
    intent = decodeJson(payload.input) as SettlementIntent;
    runtime.log(`Received settlement intent for ${intent.amount} ${intent.token}`);
    runtime.log(`Route: ${intent.sourceChain} -> ${intent.targetChain}`);
  } catch (error) {
    runtime.log("Failed to parse settlement intent");
    return {
      success: false,
      error: "Invalid JSON payload",
    };
  }

  // Validate required fields
  if (!intent.sourceChain || !intent.targetChain || !intent.amount) {
    return {
      success: false,
      error: "Missing required fields: sourceChain, targetChain, amount",
    };
  }

  // Step 1: Fetch Oracle Data (Chainlink Data Feeds)
  runtime.log("Step 1: Fetching oracle data from Chainlink Data Feeds...");
  let oracleData;
  try {
    oracleData = fetchOracleData(runtime);
    runtime.log(`Oracle fetch complete - ETH/USD: ${oracleData.ethUsdPrice}`);
  } catch (error) {
    const errorMsg = `Oracle fetch failed: ${error}`;
    runtime.log(errorMsg);
    errors.push(errorMsg);
    oracleData = {
      ethUsdPrice: 0n,
      usdcUsdPrice: 0n,
      timestamp: 0,
    };
  }

  // Step 2: Fetch Pool Health (Uniswap v4 via Tenderly fork)
  runtime.log("Step 2: Fetching pool health data...");
  let poolData;
  try {
    poolData = fetchPoolData(runtime, intent);
    runtime.log(`Pool fetch complete - liquidity: ${poolData.liquidity}`);
  } catch (error) {
    const errorMsg = `Pool fetch failed: ${error}`;
    runtime.log(errorMsg);
    errors.push(errorMsg);
    poolData = {
      sqrtPriceX96: 0n,
      tick: 0,
      liquidity: 0n,
      liquidityDepth: "shallow" as const,
      lpFee: 0,
    };
  }

  // Step 3: Fetch Bridge Status (Circle CCTP API)
  runtime.log("Step 3: Fetching bridge status from CCTP API...");
  let bridgeData;
  try {
    bridgeData = fetchBridgeData(runtime, intent);
    runtime.log(`Bridge fetch complete - status: ${bridgeData.attestationStatus}`);
  } catch (error) {
    const errorMsg = `Bridge fetch failed: ${error}`;
    runtime.log(errorMsg);
    errors.push(errorMsg);
    bridgeData = {
      attestationStatus: "unknown" as const,
      estimatedConfirmationMs: 900000, // Default 15 minutes
    };
  }

  // Aggregate all risk data
  const riskData: RiskDataFetch = {
    oracle: oracleData,
    pool: poolData,
    bridge: bridgeData,
    intent,
    metadata: {
      fetchedAt,
      complete: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    },
  };

  runtime.log("Risk data aggregation complete");
  runtime.log(`Complete: ${riskData.metadata.complete}`);
  if (errors.length > 0) {
    runtime.log(`Errors encountered: ${errors.join(", ")}`);
  }

  return {
    success: true,
    data: riskData,
    executionId: `risk-${fetchedAt}`,
  };
};

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
