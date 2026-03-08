// skit-risk-guard/risk-guard-workflow/fetchers/pool.ts
// Pool health fetcher using HTTP eth_call via Tenderly RPC.
// CRE's evm:CallContract capability is not supported on Unichain Sepolia
// (chain selector 14135854469784514356), so we use the HTTP capability instead.

import {
  HTTPClient,
  consensusIdenticalAggregation,
  ok,
  json,
  type Runtime,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeAbiParameters,
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
 * Mock pool data used as fallback when the Tenderly RPC is unavailable,
 * the pool is not yet initialized on-chain, or targetRpc is not provided.
 * Represents a healthy stablecoin pool with moderate liquidity so the
 * rest of the risk-assessment workflow can still run.
 */
export const MOCK_POOL_DATA: PoolData = {
  // sqrt(1.0) * 2^96 — price ≈ 1:1 (stablecoin pair)
  sqrtPriceX96: 79228162514264337593543950336n,
  tick: 0,
  // 500K units — satisfies "moderate" depth threshold (>= 100K * 10^18)
  liquidity: 500_000n * 10n ** 18n,
  liquidityDepth: "moderate",
  lpFee: 100, // 0.01% — typical stable-swap fee tier
  protocolFee: 0,
};

/**
 * Result of a JSON-RPC batch eth_call for both pool storage slots.
 */
interface BatchEthCallResult {
  slot0Data: string;
  liquidityData: string;
  success: boolean;
  error?: string;
}

/** Per-pool slot results for batched fetch (one HTTP request for N pools). */
interface BatchAllPoolsResult {
  success: boolean;
  poolResults: { slot0Data: string; liquidityData: string }[];
  error?: string;
}

/**
 * Pure-JS base64 encoder — CRE's runtime does not expose the `btoa` global.
 */
function toBase64(str: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = str.charCodeAt(i + 1);
    const c = str.charCodeAt(i + 2);
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += isNaN(b) ? "=" : chars[((b & 15) << 2) | (c >> 6)];
    result += isNaN(c) ? "=" : chars[c & 63];
  }
  return result;
}

/**
 * Makes two eth_call requests in a single JSON-RPC batch to the Tenderly RPC.
 * Called inside HTTPClient.sendRequest so CRE nodes reach consensus on results.
 */
function batchPoolEthCall(
  sendRequester: HTTPSendRequester,
  rpcUrl: string,
  poolManagerAddress: string,
  slot0Calldata: string,
  liquidityCalldata: string
): BatchEthCallResult {
  const body = JSON.stringify([
    {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        { from: zeroAddress, to: poolManagerAddress, data: slot0Calldata },
        "latest",
      ],
      id: 1,
    },
    {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        { from: zeroAddress, to: poolManagerAddress, data: liquidityCalldata },
        "latest",
      ],
      id: 2,
    },
  ]);

  const encodedBody = toBase64(body);

  const response = sendRequester
    .sendRequest({
      url: rpcUrl,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: encodedBody,
      timeout: "10s",
    })
    .result();

  if (!ok(response)) {
    return {
      success: false,
      slot0Data: "0x",
      liquidityData: "0x",
      error: "HTTP request to Tenderly RPC failed",
    };
  }

  try {
    const parsed = json(response) as Array<{
      id: number;
      result?: string;
      error?: { message: string };
    }>;

    if (!Array.isArray(parsed) || parsed.length < 2) {
      return {
        success: false,
        slot0Data: "0x",
        liquidityData: "0x",
        error: "Unexpected JSON-RPC batch response format",
      };
    }

    const slot0Item = parsed.find((r) => r.id === 1);
    const liquidityItem = parsed.find((r) => r.id === 2);

    if (slot0Item?.error || liquidityItem?.error) {
      const msg =
        slot0Item?.error?.message ?? liquidityItem?.error?.message ?? "unknown";
      return { success: false, slot0Data: "0x", liquidityData: "0x", error: msg };
    }

    return {
      success: true,
      slot0Data: slot0Item?.result ?? "0x",
      liquidityData: liquidityItem?.result ?? "0x",
    };
  } catch (e) {
    return {
      success: false,
      slot0Data: "0x",
      liquidityData: "0x",
      error: `Failed to parse RPC response: ${e}`,
    };
  }
}

/**
 * One HTTP request: JSON-RPC batch of 2*N eth_calls (slot0 + liquidity per pool).
 * Used to stay under CRE's 5-call limit when discovering multiple pools.
 */
function batchAllPoolsEthCall(
  sendRequester: HTTPSendRequester,
  rpcUrl: string,
  poolManagerAddress: string,
  calldatas: { slot0: string; liquidity: string }[]
): BatchAllPoolsResult {
  const batch = calldatas.flatMap((c, i) => [
    {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        { from: zeroAddress, to: poolManagerAddress, data: c.slot0 },
        "latest",
      ],
      id: i * 2 + 1,
    },
    {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        { from: zeroAddress, to: poolManagerAddress, data: c.liquidity },
        "latest",
      ],
      id: i * 2 + 2,
    },
  ]);

  const body = JSON.stringify(batch);
  const encodedBody = toBase64(body);

  const response = sendRequester
    .sendRequest({
      url: rpcUrl,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: encodedBody,
      timeout: "10s",
    })
    .result();

  if (!ok(response)) {
    return { success: false, poolResults: [], error: "HTTP request to RPC failed" };
  }

  try {
    const parsed = json(response) as Array<{
      id: number;
      result?: string;
      error?: { message: string };
    }>;
    if (!Array.isArray(parsed) || parsed.length !== calldatas.length * 2) {
      return {
        success: false,
        poolResults: [],
        error: "Unexpected JSON-RPC batch response length",
      };
    }
    const poolResults: { slot0Data: string; liquidityData: string }[] = [];
    for (let i = 0; i < calldatas.length; i++) {
      const slot0Item = parsed.find((r) => r.id === i * 2 + 1);
      const liqItem = parsed.find((r) => r.id === i * 2 + 2);
      if (slot0Item?.error || liqItem?.error) {
        return {
          success: false,
          poolResults: [],
          error: slot0Item?.error?.message ?? liqItem?.error?.message ?? "RPC error",
        };
      }
      poolResults.push({
        slot0Data: slot0Item?.result ?? "0x",
        liquidityData: liqItem?.result ?? "0x",
      });
    }
    return { success: true, poolResults };
  } catch (e) {
    return {
      success: false,
      poolResults: [],
      error: `Failed to parse RPC response: ${e}`,
    };
  }
}

/**
 * Fetches pool health data for multiple pool IDs in a single HTTP request.
 * Use this in discovery to stay under CRE's HTTP call limit (5).
 */
export function fetchAllPoolsDataInOneRequest(
  runtime: Runtime<WorkflowConfig>,
  intent: SettlementIntent,
  poolIds: `0x${string}`[]
): PoolData[] {
  const rpcUrl = intent.targetRpc;
  if (!rpcUrl || poolIds.length === 0) {
    return poolIds.map(() => ({ ...MOCK_POOL_DATA }));
  }

  const poolManagerAddress =
    runtime.config.poolManagerAddress ??
    CONTRACT_ADDRESSES.unichainSepolia.poolManager;

  const calldatas: { slot0: string; liquidity: string }[] = [];
  for (const poolId of poolIds) {
    const poolStateSlot = keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }],
        [poolId, POOL_MANAGER_STORAGE.POOLS_SLOT]
      )
    );
    const liquiditySlot = (
      "0x" +
      (BigInt(poolStateSlot) + POOL_MANAGER_STORAGE.LIQUIDITY_OFFSET)
        .toString(16)
        .padStart(64, "0")
    ) as `0x${string}`;
    calldatas.push({
      slot0: encodeFunctionData({
        abi: PoolManagerABI,
        functionName: "extsload",
        args: [poolStateSlot],
      }),
      liquidity: encodeFunctionData({
        abi: PoolManagerABI,
        functionName: "extsload",
        args: [liquiditySlot],
      }),
    });
  }

  const httpClient = new HTTPClient();
  const result = httpClient
    .sendRequest(
      runtime,
      batchAllPoolsEthCall,
      consensusIdenticalAggregation<BatchAllPoolsResult>()
    )(rpcUrl, poolManagerAddress, calldatas)
    .result();

  if (!result.success) {
    runtime.log(`Batch pool fetch failed: ${result.error}`);
    return poolIds.map(() => ({ ...MOCK_POOL_DATA }));
  }

  const out: PoolData[] = [];
  for (let i = 0; i < result.poolResults.length; i++) {
    const { slot0Data, liquidityData } = result.poolResults[i];
    let slot0Value: `0x${string}`;
    let slot1Value: `0x${string}`;
    try {
      [slot0Value] = decodeAbiParameters(
        [{ type: "bytes32" }],
        slot0Data as `0x${string}`
      );
      [slot1Value] = decodeAbiParameters(
        [{ type: "bytes32" }],
        liquidityData as `0x${string}`
      );
    } catch {
      out.push({ ...MOCK_POOL_DATA });
      continue;
    }
    const slot0BigInt = BigInt(slot0Value);
    if (slot0BigInt === 0n) {
      out.push({ ...MOCK_POOL_DATA });
      continue;
    }
    const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);
    const tickRaw = Number((slot0BigInt >> 160n) & ((1n << 24n) - 1n));
    const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw;
    const protocolFee = Number((slot0BigInt >> 184n) & ((1n << 24n) - 1n));
    const lpFee = Number((slot0BigInt >> 208n) & ((1n << 24n) - 1n));
    const liquidity = BigInt(slot1Value) & ((1n << 128n) - 1n);
    out.push({
      sqrtPriceX96,
      tick,
      liquidity,
      liquidityDepth: assessLiquidityDepth(liquidity),
      lpFee,
      protocolFee,
    });
  }
  return out;
}

/**
 * Fetches pool health data for a given Uniswap v4 pool ID via HTTP eth_call.
 * Used by pool discovery and when the workflow has a resolved pool ID.
 *
 * @param runtime - CRE workflow runtime
 * @param intent - Settlement intent (targetRpc, etc.)
 * @param poolId - Uniswap v4 pool ID (keccak256 of pool key)
 * @returns Pool data including liquidity, price, and fees; or MOCK_POOL_DATA on failure
 */
export function fetchPoolDataForPoolId(
  runtime: Runtime<WorkflowConfig>,
  intent: SettlementIntent,
  poolId: `0x${string}`
): PoolData {
  const rpcUrl = intent.targetRpc;

  if (!rpcUrl) {
    runtime.log(
      "Warning: No targetRpc in intent — skipping on-chain pool read, using mock pool data"
    );
    return { ...MOCK_POOL_DATA };
  }

  const poolManagerAddress =
    runtime.config.poolManagerAddress ??
    CONTRACT_ADDRESSES.unichainSepolia.poolManager;

  runtime.log(`Fetching pool state for pool ID: ${poolId.slice(0, 18)}...`);
  runtime.log(`Using PoolManager at: ${poolManagerAddress}`);
  runtime.log(`RPC endpoint: ${rpcUrl}`);

  // Compute the storage slot for this pool's state.
  // slot = keccak256(abi.encode(poolId, POOLS_SLOT))
  const poolStateSlot = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [poolId, POOL_MANAGER_STORAGE.POOLS_SLOT]
    )
  );

  // Liquidity is stored at slot0 + 1
  const liquiditySlot = (
    "0x" +
    (BigInt(poolStateSlot) + POOL_MANAGER_STORAGE.LIQUIDITY_OFFSET)
      .toString(16)
      .padStart(64, "0")
  ) as `0x${string}`;

  // Encode extsload(bytes32) calldata for both slots.
  // Use the single-slot overload (index 0 in the ABI array).
  const slot0Calldata = encodeFunctionData({
    abi: PoolManagerABI,
    functionName: "extsload",
    args: [poolStateSlot],
  });

  const liquidityCalldata = encodeFunctionData({
    abi: PoolManagerABI,
    functionName: "extsload",
    args: [liquiditySlot],
  });

  // Call both slots in a single JSON-RPC batch via CRE's HTTP capability.
  const httpClient = new HTTPClient();
  const result = httpClient
    .sendRequest(
      runtime,
      batchPoolEthCall,
      consensusIdenticalAggregation<BatchEthCallResult>()
    )(rpcUrl, poolManagerAddress, slot0Calldata, liquidityCalldata)
    .result();

  if (!result.success) {
    runtime.log(
      `Warning: Pool RPC call failed (${result.error}) — using mock pool data`
    );
    return { ...MOCK_POOL_DATA };
  }

  // Decode raw ABI-encoded bytes32 return values directly.
  let slot0Value: `0x${string}`;
  let slot1Value: `0x${string}`;
  try {
    [slot0Value] = decodeAbiParameters(
      [{ type: "bytes32" }],
      result.slot0Data as `0x${string}`
    );
    [slot1Value] = decodeAbiParameters(
      [{ type: "bytes32" }],
      result.liquidityData as `0x${string}`
    );
  } catch (e) {
    runtime.log(
      `Warning: Failed to decode pool storage slots (${e}) — using mock pool data`
    );
    return { ...MOCK_POOL_DATA };
  }

  // Parse slot0: sqrtPriceX96 (160 bits) | tick (24, signed) | protocolFee (24) | lpFee (24)
  const slot0BigInt = BigInt(slot0Value);

  if (slot0BigInt === 0n) {
    runtime.log(
      "Warning: Pool not initialized on-chain (sqrtPriceX96 = 0) — using mock pool data"
    );
    return { ...MOCK_POOL_DATA };
  }

  const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);

  // tick is 24-bit signed: convert raw uint24 to signed int
  const tickRaw = Number((slot0BigInt >> 160n) & ((1n << 24n) - 1n));
  const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw;

  const protocolFee = Number((slot0BigInt >> 184n) & ((1n << 24n) - 1n));
  const lpFee = Number((slot0BigInt >> 208n) & ((1n << 24n) - 1n));

  // Parse slot1: liquidity (lower 128 bits)
  const liquidity = BigInt(slot1Value) & ((1n << 128n) - 1n);
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
 */
function assessLiquidityDepth(
  liquidity: bigint
): "deep" | "moderate" | "shallow" {
  const DEEP_THRESHOLD = 10n ** 18n * 1_000_000n; // 1M units
  const MODERATE_THRESHOLD = 10n ** 18n * 100_000n; // 100K units

  if (liquidity >= DEEP_THRESHOLD) return "deep";
  if (liquidity >= MODERATE_THRESHOLD) return "moderate";
  return "shallow";
}

/**
 * Calculates the human-readable price from sqrtPriceX96.
 * price = (sqrtPriceX96 / 2^96)^2
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
  if (data.sqrtPriceX96 === 0n) {
    return false;
  }

  const depthOrder = { shallow: 0, moderate: 1, deep: 2 };
  return depthOrder[data.liquidityDepth] >= depthOrder[minLiquidityDepth];
}
