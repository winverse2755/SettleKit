import {
  HTTPClient,
  consensusIdenticalAggregation,
  json,
  ok,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  zeroAddress,
} from "viem";
import type { MonitoringWorkflowConfig, PoolHealth } from "../types";

const POOL_MANAGER_ABI = [
  {
    name: "extsload",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "slot", type: "bytes32" }],
    outputs: [{ name: "value", type: "bytes32" }],
  },
] as const;

const POOLS_SLOT = 6n;
const LIQUIDITY_OFFSET = 1n;

interface BatchEthCallResult {
  success: boolean;
  slot0Data: string;
  liquidityData: string;
  error?: string;
}

interface BatchAllPoolsResult {
  success: boolean;
  poolResults: Array<{ slot0Data: string; liquidityData: string }>;
  error?: string;
}

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
      error: "HTTP request to RPC failed",
    };
  }

  try {
    const parsed = json(response) as Array<{
      id: number;
      result?: string;
      error?: { message: string };
    }>;
    const slot0 = parsed.find((r) => r.id === 1);
    const liquidity = parsed.find((r) => r.id === 2);

    if (!slot0?.result || !liquidity?.result) {
      return {
        success: false,
        slot0Data: "0x",
        liquidityData: "0x",
        error: slot0?.error?.message ?? liquidity?.error?.message ?? "Missing RPC result",
      };
    }

    return {
      success: true,
      slot0Data: slot0.result,
      liquidityData: liquidity.result,
    };
  } catch (error) {
    return {
      success: false,
      slot0Data: "0x",
      liquidityData: "0x",
      error: `Failed to parse RPC response: ${error}`,
    };
  }
}

interface PoolCalldata {
  poolId: `0x${string}`;
  slot0Calldata: string;
  liquidityCalldata: string;
}

function batchAllPoolsEthCall(
  sendRequester: HTTPSendRequester,
  rpcUrl: string,
  poolManagerAddress: string,
  poolCalldatas: PoolCalldata[]
): BatchAllPoolsResult {
  const batch: Array<{
    jsonrpc: string;
    method: string;
    params: unknown[];
    id: number;
  }> = [];
  let id = 1;
  for (const p of poolCalldatas) {
    batch.push(
      {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          { from: zeroAddress, to: poolManagerAddress, data: p.slot0Calldata },
          "latest",
        ],
        id: id++,
      },
      {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            from: zeroAddress,
            to: poolManagerAddress,
            data: p.liquidityCalldata,
          },
          "latest",
        ],
        id: id++,
      }
    );
  }

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
    return {
      success: false,
      poolResults: [],
      error: "HTTP request to RPC failed",
    };
  }

  try {
    const parsed = json(response) as Array<{
      id: number;
      result?: string;
      error?: { message: string };
    }>;
    const poolResults: Array<{ slot0Data: string; liquidityData: string }> = [];
    for (let i = 0; i < poolCalldatas.length; i++) {
      const slot0Id = i * 2 + 1;
      const liquidityId = i * 2 + 2;
      const slot0 = parsed.find((r) => r.id === slot0Id);
      const liquidity = parsed.find((r) => r.id === liquidityId);
      if (!slot0?.result || !liquidity?.result) {
        return {
          success: false,
          poolResults: [],
          error:
            slot0?.error?.message ??
            liquidity?.error?.message ??
            "Missing RPC result",
        };
      }
      poolResults.push({
        slot0Data: slot0.result,
        liquidityData: liquidity.result,
      });
    }
    return { success: true, poolResults };
  } catch (error) {
    return {
      success: false,
      poolResults: [],
      error: `Failed to parse RPC response: ${error}`,
    };
  }
}

function parsePoolHealth(
  poolId: `0x${string}`,
  slot0Data: string,
  liquidityData: string
): PoolHealth {
  try {
    const [slot0Value] = decodeAbiParameters(
      [{ type: "bytes32" }],
      slot0Data as `0x${string}`
    );
    const [liquidityValue] = decodeAbiParameters(
      [{ type: "bytes32" }],
      liquidityData as `0x${string}`
    );

    const slot0BigInt = BigInt(slot0Value);
    const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);
    const tickRaw = Number((slot0BigInt >> 160n) & ((1n << 24n) - 1n));
    const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw;
    const liquidity = BigInt(liquidityValue) & ((1n << 128n) - 1n);

    return {
      poolId,
      initialized: sqrtPriceX96 > 0n,
      sqrtPriceX96,
      tick,
      liquidity,
    };
  } catch {
    return {
      poolId,
      initialized: false,
      sqrtPriceX96: 0n,
      tick: 0,
      liquidity: 0n,
    };
  }
}

/**
 * Fetch health for all pools in poolRegistry in a single HTTP request.
 */
export function fetchAllPoolHealth(
  runtime: Runtime<MonitoringWorkflowConfig>,
  poolRegistry: readonly `0x${string}`[],
  rpcUrl: string
): PoolHealth[] {
  const poolCalldatas: PoolCalldata[] = poolRegistry.map((poolId) => {
    const poolStateSlot = keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }],
        [poolId, POOLS_SLOT]
      )
    );
    const liquiditySlot = (
      "0x" +
      (BigInt(poolStateSlot) + LIQUIDITY_OFFSET).toString(16).padStart(64, "0")
    ) as `0x${string}`;

    return {
      poolId,
      slot0Calldata: encodeFunctionData({
        abi: POOL_MANAGER_ABI,
        functionName: "extsload",
        args: [poolStateSlot],
      }),
      liquidityCalldata: encodeFunctionData({
        abi: POOL_MANAGER_ABI,
        functionName: "extsload",
        args: [liquiditySlot],
      }),
    };
  });

  if (poolCalldatas.length === 0) {
    return [];
  }

  const httpClient = new HTTPClient();
  const result = httpClient
    .sendRequest(
      runtime,
      batchAllPoolsEthCall,
      consensusIdenticalAggregation<BatchAllPoolsResult>()
    )(rpcUrl, runtime.config.poolManagerAddress, poolCalldatas)
    .result();

  if (!result.success) {
    runtime.log(`[Pool health] Batch fetch failed: ${result.error}`);
    return poolCalldatas.map((p) => ({
      poolId: p.poolId,
      initialized: false,
      sqrtPriceX96: 0n,
      tick: 0,
      liquidity: 0n,
    }));
  }

  return result.poolResults.map((r, i) =>
    parsePoolHealth(
      poolCalldatas[i].poolId,
      r.slot0Data,
      r.liquidityData
    )
  );
}

export function fetchPoolHealth(
  runtime: Runtime<MonitoringWorkflowConfig>,
  poolId: `0x${string}`,
  rpcUrl: string
): PoolHealth {
  const poolStateSlot = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [poolId, POOLS_SLOT]
    )
  );
  const liquiditySlot = (
    "0x" +
    (BigInt(poolStateSlot) + LIQUIDITY_OFFSET).toString(16).padStart(64, "0")
  ) as `0x${string}`;

  const slot0Calldata = encodeFunctionData({
    abi: POOL_MANAGER_ABI,
    functionName: "extsload",
    args: [poolStateSlot],
  });
  const liquidityCalldata = encodeFunctionData({
    abi: POOL_MANAGER_ABI,
    functionName: "extsload",
    args: [liquiditySlot],
  });

  const httpClient = new HTTPClient();
  const rpcResult = httpClient
    .sendRequest(
      runtime,
      batchPoolEthCall,
      consensusIdenticalAggregation<BatchEthCallResult>()
    )(
      rpcUrl,
      runtime.config.poolManagerAddress,
      slot0Calldata,
      liquidityCalldata
    )
    .result();

  if (!rpcResult.success) {
    runtime.log(
      `[Pool health] Failed to fetch pool ${poolId}: ${rpcResult.error}`
    );
    return {
      poolId,
      initialized: false,
      sqrtPriceX96: 0n,
      tick: 0,
      liquidity: 0n,
    };
  }

  try {
    const [slot0Value] = decodeAbiParameters(
      [{ type: "bytes32" }],
      rpcResult.slot0Data as `0x${string}`
    );
    const [liquidityValue] = decodeAbiParameters(
      [{ type: "bytes32" }],
      rpcResult.liquidityData as `0x${string}`
    );

    const slot0BigInt = BigInt(slot0Value);
    const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);
    const tickRaw = Number((slot0BigInt >> 160n) & ((1n << 24n) - 1n));
    const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw;
    const liquidity = BigInt(liquidityValue) & ((1n << 128n) - 1n);

    return {
      poolId,
      initialized: sqrtPriceX96 > 0n,
      sqrtPriceX96,
      tick,
      liquidity,
    };
  } catch (error) {
    runtime.log(`[Pool health] Decode failed for ${poolId}: ${error}`);
    return {
      poolId,
      initialized: false,
      sqrtPriceX96: 0n,
      tick: 0,
      liquidity: 0n,
    };
  }
}
