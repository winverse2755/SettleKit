// skit-risk-guard/risk-guard-workflow/fetchers/oracle.ts
// Chainlink Data Feed fetcher using EVMClient

import {
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem";
import { AggregatorV3InterfaceABI, CONTRACT_ADDRESSES } from "../contracts/abi";
import type { OracleData, WorkflowConfig } from "../types";

/**
 * Fetches oracle price data from Chainlink Data Feeds on Base Sepolia.
 * Uses EVMClient to call latestRoundData() on AggregatorV3Interface contracts.
 *
 * @param runtime - CRE workflow runtime
 * @param config - Workflow configuration with feed addresses
 * @returns Oracle data with ETH/USD and USDC/USD prices
 */
export function fetchOracleData(
  runtime: Runtime<WorkflowConfig>
): OracleData {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: "ethereum-testnet-sepolia-base-1",
    isTestnet: true,
  });

  if (!network) {
    throw new Error("Base Sepolia network not found");
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  // Get feed addresses from config or use defaults
  const ethUsdFeed =
    runtime.config.chainlinkFeeds?.baseSepolia?.ETH_USD ??
    CONTRACT_ADDRESSES.baseSepolia.chainlinkFeeds.ETH_USD;
  const usdcUsdFeed =
    runtime.config.chainlinkFeeds?.baseSepolia?.USDC_USD ??
    CONTRACT_ADDRESSES.baseSepolia.chainlinkFeeds.USDC_USD;

  runtime.log(`Fetching ETH/USD from ${ethUsdFeed}`);
  runtime.log(`Fetching USDC/USD from ${usdcUsdFeed}`);

  // Encode latestRoundData() call
  const callData = encodeFunctionData({
    abi: AggregatorV3InterfaceABI,
    functionName: "latestRoundData",
  });

  // Fetch ETH/USD price
  const ethUsdResponse = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: ethUsdFeed as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  // Fetch USDC/USD price
  const usdcUsdResponse = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: usdcUsdFeed as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  // Decode ETH/USD response
  const ethUsdResult = decodeFunctionResult({
    abi: AggregatorV3InterfaceABI,
    functionName: "latestRoundData",
    data: bytesToHex(ethUsdResponse.data),
  });

  // Decode USDC/USD response
  const usdcUsdResult = decodeFunctionResult({
    abi: AggregatorV3InterfaceABI,
    functionName: "latestRoundData",
    data: bytesToHex(usdcUsdResponse.data),
  });

  // Extract values from tuple response
  // latestRoundData returns: (roundId, answer, startedAt, updatedAt, answeredInRound)
  const [ethRoundId, ethAnswer, , ethUpdatedAt] = ethUsdResult as [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
  ];
  const [, usdcAnswer, , usdcUpdatedAt] = usdcUsdResult as [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
  ];

  // Use the most recent timestamp
  const timestamp = Math.max(Number(ethUpdatedAt), Number(usdcUpdatedAt));

  runtime.log(`ETH/USD price: ${ethAnswer.toString()} (8 decimals)`);
  runtime.log(`USDC/USD price: ${usdcAnswer.toString()} (8 decimals)`);

  return {
    ethUsdPrice: ethAnswer,
    usdcUsdPrice: usdcAnswer,
    timestamp,
    roundId: ethRoundId,
  };
}

/**
 * Validates oracle data freshness.
 * Prices should not be older than the specified staleness threshold.
 *
 * @param data - Oracle data to validate
 * @param maxStalenessSeconds - Maximum allowed staleness in seconds (default: 3600)
 * @returns True if data is fresh, false otherwise
 */
export function isOracleDataFresh(
  data: OracleData,
  maxStalenessSeconds: number = 3600
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - data.timestamp;
  return age <= maxStalenessSeconds;
}

/**
 * Converts Chainlink price (8 decimals) to human-readable format.
 *
 * @param price - Price with 8 decimals
 * @returns Human-readable price as number
 */
export function formatChainlinkPrice(price: bigint): number {
  return Number(price) / 1e8;
}
