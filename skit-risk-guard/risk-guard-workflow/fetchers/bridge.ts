// skit-risk-guard/risk-guard-workflow/fetchers/bridge.ts
// CCTP bridge status fetcher using HTTPClient

import {
  HTTPClient,
  consensusIdenticalAggregation,
  ok,
  json,
  type Runtime,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import { CCTP_DOMAINS } from "../contracts/abi";
import type {
  BridgeData,
  SettlementIntent,
  WorkflowConfig,
  CCTPMessageStatus,
} from "../types";

// Default CCTP API URL (sandbox/testnet)
const DEFAULT_CCTP_API_URL = "https://iris-api-sandbox.circle.com";

// Estimated confirmation times by domain (in milliseconds)
const ESTIMATED_CONFIRMATION_TIMES: Record<number, number> = {
  [CCTP_DOMAINS.ethereumSepolia]: 900000, // ~15 minutes
  [CCTP_DOMAINS.baseSepolia]: 600000, // ~10 minutes
  [CCTP_DOMAINS.arbitrumSepolia]: 600000, // ~10 minutes
  [CCTP_DOMAINS.optimismSepolia]: 600000, // ~10 minutes
  [CCTP_DOMAINS.avalancheFuji]: 60000, // ~1 minute
  [CCTP_DOMAINS.polygonAmoy]: 300000, // ~5 minutes
};

/**
 * Maps chain identifiers to CCTP domain IDs.
 */
function getChainDomain(chainName: string): number | undefined {
  const chainMap: Record<string, number> = {
    ethereum: CCTP_DOMAINS.ethereum,
    ethereumSepolia: CCTP_DOMAINS.ethereumSepolia,
    base: CCTP_DOMAINS.base,
    baseSepolia: CCTP_DOMAINS.baseSepolia,
    arbitrum: CCTP_DOMAINS.arbitrum,
    arbitrumSepolia: CCTP_DOMAINS.arbitrumSepolia,
    optimism: CCTP_DOMAINS.optimism,
    optimismSepolia: CCTP_DOMAINS.optimismSepolia,
    avalanche: CCTP_DOMAINS.avalanche,
    avalancheFuji: CCTP_DOMAINS.avalancheFuji,
    polygon: CCTP_DOMAINS.polygon,
    polygonAmoy: CCTP_DOMAINS.polygonAmoy,
  };
  return chainMap[chainName];
}

/**
 * Internal function to fetch CCTP attestation service status.
 * Called within HTTPClient.sendRequest context.
 */
function fetchCCTPStatus(
  sendRequester: HTTPSendRequester,
  apiUrl: string,
  sourceDomain: number
): CCTPServiceStatus {
  // Query the CCTP attestation service health endpoint
  // This checks if the service is operational for the given domain
  const healthUrl = `${apiUrl}/v2/health`;

  const response = sendRequester
    .sendRequest({
      url: healthUrl,
      method: "GET",
      timeout: "8s",
    })
    .result();

  if (!ok(response)) {
    return {
      isHealthy: false,
      attestationStatus: "unknown",
      estimatedConfirmationMs: getDefaultConfirmationTime(sourceDomain),
    };
  }

  try {
    const data = json(response) as { status?: string };
    const isHealthy = data.status === "healthy" || data.status === "ok";

    return {
      isHealthy,
      attestationStatus: isHealthy ? "pending" : "unknown",
      estimatedConfirmationMs: getDefaultConfirmationTime(sourceDomain),
    };
  } catch {
    return {
      isHealthy: false,
      attestationStatus: "unknown",
      estimatedConfirmationMs: getDefaultConfirmationTime(sourceDomain),
    };
  }
}

interface CCTPServiceStatus {
  isHealthy: boolean;
  attestationStatus: "pending" | "complete" | "failed" | "unknown";
  estimatedConfirmationMs: number;
  queuePosition?: number;
}

/**
 * Gets the default confirmation time for a domain.
 */
function getDefaultConfirmationTime(domain: number): number {
  return ESTIMATED_CONFIRMATION_TIMES[domain] ?? 900000; // Default 15 minutes
}

/**
 * Fetches bridge status data from Circle CCTP API.
 * Uses HTTPClient for decentralized consensus on API responses.
 *
 * Note: CCTP cannot be fully forked, so this remains a live external check.
 * The workflow queries the attestation service status and estimates
 * confirmation times based on source/destination domains.
 *
 * @param runtime - CRE workflow runtime
 * @param intent - Settlement intent with chain information
 * @returns Bridge status data including attestation status and timing estimates
 */
export function fetchBridgeData(
  runtime: Runtime<WorkflowConfig>,
  intent: SettlementIntent
): BridgeData {
  const httpClient = new HTTPClient();

  // Get CCTP API URL from config or use default
  const apiUrl = runtime.config.cctpApiUrl ?? DEFAULT_CCTP_API_URL;

  // Resolve chain names to CCTP domain IDs
  const sourceDomain = getChainDomain(intent.sourceChain);
  const destinationDomain = getChainDomain(intent.targetChain);

  runtime.log(`CCTP source domain: ${sourceDomain} (${intent.sourceChain})`);
  runtime.log(
    `CCTP destination domain: ${destinationDomain} (${intent.targetChain})`
  );
  runtime.log(`Using CCTP API: ${apiUrl}`);

  if (sourceDomain === undefined || destinationDomain === undefined) {
    runtime.log("Warning: Unknown CCTP domain, using estimates");
    return {
      attestationStatus: "unknown",
      estimatedConfirmationMs: 900000, // Default 15 minutes
      sourceDomain,
      destinationDomain,
    };
  }

  // Fetch CCTP service status using HTTPClient with consensus
  const status = httpClient
    .sendRequest(
      runtime,
      fetchCCTPStatus,
      consensusIdenticalAggregation<CCTPServiceStatus>()
    )(apiUrl, sourceDomain)
    .result();

  runtime.log(`CCTP service healthy: ${status.isHealthy}`);
  runtime.log(`Attestation status: ${status.attestationStatus}`);
  runtime.log(`Estimated confirmation: ${status.estimatedConfirmationMs}ms`);

  return {
    attestationStatus: status.attestationStatus,
    estimatedConfirmationMs: status.estimatedConfirmationMs,
    queuePosition: status.queuePosition,
    sourceDomain,
    destinationDomain,
  };
}

/**
 * Checks if a specific message has been attested by CCTP.
 * This is useful when checking status of an in-flight transfer.
 *
 * @param runtime - CRE workflow runtime
 * @param sourceDomain - CCTP source domain ID
 * @param transactionHash - Transaction hash that burned USDC
 * @returns Message status from CCTP API
 */
export function fetchMessageAttestation(
  runtime: Runtime<WorkflowConfig>,
  sourceDomain: number,
  transactionHash: string
): CCTPMessageStatus {
  const httpClient = new HTTPClient();
  const apiUrl = runtime.config.cctpApiUrl ?? DEFAULT_CCTP_API_URL;

  const fetchAttestation = (
    sendRequester: HTTPSendRequester,
    url: string,
    domain: number,
    txHash: string
  ): CCTPMessageStatus => {
    const attestationUrl = `${url}/v2/messages/${domain}?transactionHash=${txHash}`;

    const response = sendRequester
      .sendRequest({
        url: attestationUrl,
        method: "GET",
        timeout: "8s",
      })
      .result();

    if (!ok(response)) {
      return {
        status: "unknown",
      };
    }

    try {
      const data = json(response) as {
        messages?: Array<{
          status: string;
          attestation?: string;
          message?: string;
          eventNonce?: string;
          sourceDomain?: number;
          destinationDomain?: number;
        }>;
      };

      if (data.messages && data.messages.length > 0) {
        const msg = data.messages[0];
        return {
          status: msg.status,
          attestation: msg.attestation,
          message: msg.message,
          eventNonce: msg.eventNonce,
          sourceDomain: msg.sourceDomain,
          destinationDomain: msg.destinationDomain,
        };
      }

      return { status: "pending" };
    } catch {
      return { status: "unknown" };
    }
  };

  return httpClient
    .sendRequest(
      runtime,
      fetchAttestation,
      consensusIdenticalAggregation<CCTPMessageStatus>()
    )(apiUrl, sourceDomain, transactionHash)
    .result();
}

/**
 * Validates bridge data meets requirements for settlement execution.
 *
 * @param data - Bridge data to validate
 * @param maxDelayMs - Maximum acceptable delay in milliseconds
 * @returns True if bridge conditions are acceptable
 */
export function isBridgeReady(data: BridgeData, maxDelayMs: number): boolean {
  // Check if attestation service is operational
  if (data.attestationStatus === "failed") {
    return false;
  }

  // Check if estimated confirmation time is within acceptable range
  if (data.estimatedConfirmationMs > maxDelayMs) {
    return false;
  }

  return true;
}

/**
 * Calculates total estimated bridge time including safety margin.
 *
 * @param data - Bridge data
 * @param safetyMarginPercent - Safety margin as percentage (default: 20%)
 * @returns Total estimated time in milliseconds
 */
export function calculateTotalBridgeTime(
  data: BridgeData,
  safetyMarginPercent: number = 20
): number {
  const baseTime = data.estimatedConfirmationMs;
  const margin = baseTime * (safetyMarginPercent / 100);
  return baseTime + margin;
}
