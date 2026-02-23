// skit-risk-guard/risk-guard-workflow/fetchers/pool.ts
// Pool health fetcher using EVMClient with Tenderly fork RPC

import {
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  keccak256,
  zeroAddress,
} from "viem";
import {
  PoolManagerABI,
  CONTRACT_ADDRESSES,
  POOL_MANAGER_STORAGE,
} from "../contracts/abi";
import type { PoolData, SettlementIntent, WorkflowConfig } from "../types";

/**
 * Fetches pool health data from Uniswap v4 PoolManager using extsload.
 * Reads pool state directly from storage slots for reliable data access.
 *
 * Storage layout for Uniswap v4 pools:
 * - slot0 (256 bits): sqrtPriceX96 (160) | tick (24, signed) | protocolFee (24) | lpFee (24)
 * - slot1 (256 bits): liquidity (128)
 *
 * @param runtime - CRE workflow runtime
 * @param intent - Settlement intent with pool address and RPC config
 * @returns Pool data including liquidity, price, and fees
 */
export function fetchPoolData(
  runtime: Runtime<WorkflowConfig>,
  intent: SettlementIntent
): PoolData {
  // Use Unichain Sepolia network for pool queries
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: "ethereum-testnet-sepolia", // Fallback - actual RPC configured via project.yaml
    isTestnet: true,
  });

  if (!network) {
    throw new Error("Network not found for pool queries");
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  // Get pool manager address from config or use default
  const poolManagerAddress =
    runtime.config.poolManagerAddress ??
    CONTRACT_ADDRESSES.unichainSepolia.poolManager;

  // The targetPoolAddress in intent should be the pool ID (bytes32)
  const poolId = intent.targetPoolAddress as `0x${string}`;

  runtime.log(`Fetching pool state for pool ID: ${poolId}`);
  runtime.log(`Using PoolManager at: ${poolManagerAddress}`);

  // Compute the storage slot for this pool's state
  // slot = keccak256(abi.encode(poolId, POOLS_SLOT))
  const poolStateSlot = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [poolId, POOL_MANAGER_STORAGE.POOLS_SLOT]
    )
  );

  // Compute slot for liquidity (slot0 + 1)
  const liquiditySlot = (
    "0x" +
    (BigInt(poolStateSlot) + POOL_MANAGER_STORAGE.LIQUIDITY_OFFSET)
      .toString(16)
      .padStart(64, "0")
  ) as `0x${string}`;

  // Encode extsload calls for slot0 and liquidity slot
  const slot0CallData = encodeFunctionData({
    abi: PoolManagerABI,
    functionName: "extsload",
    args: [poolStateSlot],
  });

  const liquidityCallData = encodeFunctionData({
    abi: PoolManagerABI,
    functionName: "extsload",
    args: [liquiditySlot],
  });

  // Fetch slot0 (contains sqrtPriceX96, tick, fees)
  const slot0Response = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: poolManagerAddress as `0x${string}`,
        data: slot0CallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  // Fetch liquidity slot
  const liquidityResponse = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: poolManagerAddress as `0x${string}`,
        data: liquidityCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  // Decode responses
  const slot0Value = decodeFunctionResult({
    abi: PoolManagerABI,
    functionName: "extsload",
    data: bytesToHex(slot0Response.data),
  }) as `0x${string}`;

  const slot1Value = decodeFunctionResult({
    abi: PoolManagerABI,
    functionName: "extsload",
    data: bytesToHex(liquidityResponse.data),
  }) as `0x${string}`;

  // Parse slot0: sqrtPriceX96 (160 bits) | tick (24 bits signed) | protocolFee (24 bits) | lpFee (24 bits)
  const slot0BigInt = BigInt(slot0Value);
  const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);

  // Extract tick (24 bits signed, starting at bit 160)
  const tickRaw = Number((slot0BigInt >> 160n) & ((1n << 24n) - 1n));
  // Convert to signed int24: if bit 23 is set, it's negative
  const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw;

  // Extract protocolFee (24 bits, starting at bit 184)
  const protocolFee = Number((slot0BigInt >> 184n) & ((1n << 24n) - 1n));

  // Extract lpFee (24 bits, starting at bit 208)
  const lpFee = Number((slot0BigInt >> 208n) & ((1n << 24n) - 1n));

  // Parse slot1: liquidity (128 bits)
  const liquidity = BigInt(slot1Value) & ((1n << 128n) - 1n);

  // Assess liquidity depth
  const liquidityDepth = assessLiquidityDepth(liquidity);

  runtime.log(`Pool sqrtPriceX96: ${sqrtPriceX96.toString()}`);
  runtime.log(`Pool tick: ${tick}`);
  runtime.log(`Pool liquidity: ${liquidity.toString()}`);
  runtime.log(`Pool lpFee: ${lpFee} (${lpFee / 10000}%)`);
  runtime.log(`Liquidity depth: ${liquidityDepth}`);

  return {
    sqrtPriceX96,
    tick,
    liquidity,
    liquidityDepth,
    lpFee,
    protocolFee,
  };
}

/**
 * Assesses liquidity depth category based on liquidity amount.
 *
 * @param liquidity - Pool liquidity value
 * @returns Depth category: "deep", "moderate", or "shallow"
 */
function assessLiquidityDepth(
  liquidity: bigint
): "deep" | "moderate" | "shallow" {
  // Thresholds in liquidity units (adjust based on token decimals and expected volumes)
  const DEEP_THRESHOLD = 10n ** 18n * 1000000n; // 1M units
  const MODERATE_THRESHOLD = 10n ** 18n * 100000n; // 100K units

  if (liquidity >= DEEP_THRESHOLD) return "deep";
  if (liquidity >= MODERATE_THRESHOLD) return "moderate";
  return "shallow";
}

/**
 * Calculates the human-readable price from sqrtPriceX96.
 * price = (sqrtPriceX96 / 2^96)^2
 *
 * @param sqrtPriceX96 - Square root price in Q64.96 format
 * @returns Human-readable price
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  return sqrtPrice * sqrtPrice;
}

/**
 * Estimates slippage for a given trade amount.
 * Uses simplified constant product formula approximation.
 *
 * @param liquidity - Pool liquidity
 * @param amountIn - Trade amount as string
 * @param sqrtPriceX96 - Current sqrt price
 * @returns Estimated slippage as decimal (e.g., 0.01 for 1%)
 */
export function estimateSlippage(
  liquidity: bigint,
  amountIn: string,
  sqrtPriceX96: bigint
): number {
  const amount = BigInt(amountIn);

  if (liquidity === 0n) {
    return 1; // 100% slippage if no liquidity
  }

  const Q96 = 2n ** 96n;
  const effectiveLiquidity = (liquidity * sqrtPriceX96) / Q96;

  if (effectiveLiquidity === 0n) {
    return 1;
  }

  const slippage = Number(amount) / (2 * Number(effectiveLiquidity));
  return Math.min(slippage, 1);
}

/**
 * Validates pool data meets minimum requirements for settlement.
 *
 * @param data - Pool data to validate
 * @param minLiquidityDepth - Minimum required liquidity depth
 * @returns True if pool meets requirements
 */
export function isPoolHealthy(
  data: PoolData,
  minLiquidityDepth: "deep" | "moderate" | "shallow" = "shallow"
): boolean {
  // Check if pool is initialized (sqrtPriceX96 > 0)
  if (data.sqrtPriceX96 === 0n) {
    return false;
  }

  // Check liquidity depth meets minimum
  const depthOrder = { shallow: 0, moderate: 1, deep: 2 };
  return depthOrder[data.liquidityDepth] >= depthOrder[minLiquidityDepth];
}
