// skit-risk-guard/risk-guard-workflow/utils/pool-discovery.ts
// Pool key computation and discovery for Uniswap v4 ETH/USDC pools.
// Mirrors logic from packages/sdk/src/utils/pool-discovery.ts for use in CRE workflow.

import { encodeAbiParameters, keccak256, type Address } from "viem";
import type { PoolData, PoolKeyReport, SettlementIntent, WorkflowConfig } from "../types";
import type { Runtime } from "@chainlink/cre-sdk";
import { fetchAllPoolsDataInOneRequest } from "../fetchers/pool";

/** Uniswap v4 pool key */
export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

/** Standard fee tiers (fee in 1/1e6, e.g. 3000 = 0.30%) */
const STANDARD_FEE_TIERS: readonly { fee: number; tickSpacing: number }[] = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 3000, tickSpacing: 60 },
  { fee: 10000, tickSpacing: 200 },
];

/** ETH/USDC token addresses for Unichain Sepolia (matches packages/sdk) */
const TOKEN_ADDRESSES = {
  unichainSepolia: {
    nativeEth: "0x0000000000000000000000000000000000000000" as Address,
    usdc: "0x31d0220469e10c4e71834a79b1f276d740d3768f" as Address,
  },
} as const;

export function computePoolId(poolKey: PoolKey): `0x${string}` {
  const encoded = encodeAbiParameters(
    [
      { type: "address" },
      { type: "address" },
      { type: "uint24" },
      { type: "int24" },
      { type: "address" },
    ],
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks,
    ]
  );
  return keccak256(encoded);
}

export function generatePoolKeys(
  tokenA: Address,
  tokenB: Address,
  hooks: Address = "0x0000000000000000000000000000000000000000"
): PoolKey[] {
  const [currency0, currency1] =
    tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  return STANDARD_FEE_TIERS.map((tier) => ({
    currency0,
    currency1,
    fee: tier.fee,
    tickSpacing: tier.tickSpacing,
    hooks,
  }));
}

function poolKeyToReport(poolKey: PoolKey): PoolKeyReport {
  return {
    currency0: poolKey.currency0,
    currency1: poolKey.currency1,
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks: poolKey.hooks,
  };
}

/** Liquidity depth order for sorting (higher = better) */
const DEPTH_ORDER: Record<string, number> = {
  deep: 3,
  moderate: 2,
  shallow: 1,
};

/**
 * Discover the best initialized ETH/USDC pool on the target chain.
 * Uses intent.targetChain and intent.targetRpc; matches SDK discoverEthUsdcPools + findBestPool.
 */
export function discoverBestPool(
  runtime: Runtime<WorkflowConfig>,
  intent: SettlementIntent
): { poolId: `0x${string}`; poolKey: PoolKeyReport; poolData: PoolData } | null {
  const rpcUrl = intent.targetRpc;
  if (!rpcUrl) {
    runtime.log("No targetRpc in intent — skipping pool discovery");
    return null;
  }

  const addrs = TOKEN_ADDRESSES.unichainSepolia;
  if (!addrs) {
    runtime.log("Token addresses not configured for target chain");
    return null;
  }

  const poolKeys = generatePoolKeys(addrs.nativeEth, addrs.usdc);
  const poolIds = poolKeys.map((pk) => computePoolId(pk));
  runtime.log(
    `Discovering best ETH/USDC pool (${poolKeys.length} fee tiers) on ${intent.targetChain} — 1 HTTP batch...`
  );

  // Single HTTP request for all pools to stay under CRE's 5-call limit
  const allPoolData = fetchAllPoolsDataInOneRequest(runtime, intent, poolIds);
  const results: { poolKey: PoolKey; poolId: `0x${string}`; poolData: PoolData }[] = [];
  for (let i = 0; i < poolKeys.length; i++) {
    const poolData = allPoolData[i];
    if (poolData && poolData.sqrtPriceX96 > 0n) {
      results.push({ poolKey: poolKeys[i], poolId: poolIds[i], poolData });
      runtime.log(
        `  ${poolKeys[i].fee / 10000}% fee: initialized, liquidity=${poolData.liquidity.toString()}, depth=${poolData.liquidityDepth}`
      );
    }
  }

  if (results.length === 0) {
    runtime.log("No initialized ETH/USDC pools found");
    return null;
  }

  results.sort((a, b) => {
    const depthDiff =
      (DEPTH_ORDER[b.poolData.liquidityDepth] ?? 0) -
      (DEPTH_ORDER[a.poolData.liquidityDepth] ?? 0);
    if (depthDiff !== 0) return depthDiff;
    return b.poolData.liquidity > a.poolData.liquidity
      ? 1
      : b.poolData.liquidity < a.poolData.liquidity
        ? -1
        : a.poolKey.fee - b.poolKey.fee;
  });

  const best = results[0];
  runtime.log(
    `Selected pool: fee ${best.poolKey.fee / 10000}%, poolId=${best.poolId.slice(0, 18)}...`
  );
  return {
    poolId: best.poolId,
    poolKey: poolKeyToReport(best.poolKey),
    poolData: best.poolData,
  };
}
