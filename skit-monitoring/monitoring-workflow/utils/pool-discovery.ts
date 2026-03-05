// skit-monitoring/monitoring-workflow/utils/pool-discovery.ts
// Same ETH/USDC pool key computation as risk-guard and packages/sdk.
// Returns the four standard fee-tier pool IDs so monitoring uses the same
// pool set that risk-guard can select from.

import { encodeAbiParameters, keccak256, type Address } from "viem";

interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

/** Standard fee tiers (fee in 1/1e6, e.g. 3000 = 0.30%) - matches risk-guard & SDK */
const STANDARD_FEE_TIERS: readonly { fee: number; tickSpacing: number }[] = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 3000, tickSpacing: 60 },
  { fee: 10000, tickSpacing: 200 },
];

/** ETH/USDC on Unichain Sepolia - matches risk-guard and packages/sdk */
const TOKEN_ADDRESSES = {
  nativeEth: "0x0000000000000000000000000000000000000000" as Address,
  usdc: "0x31d0220469e10c4e71834a79b1f276d740d3768f" as Address,
};

function computePoolId(poolKey: PoolKey): `0x${string}` {
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

function generatePoolKeys(
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

/**
 * Returns the four ETH/USDC pool IDs for Unichain Sepolia (standard fee tiers).
 * Same set risk-guard discovers; use these so the position's pool is always in the snapshot.
 */
export function getEthUsdcPoolIds(): `0x${string}`[] {
  const poolKeys = generatePoolKeys(TOKEN_ADDRESSES.nativeEth, TOKEN_ADDRESSES.usdc);
  return poolKeys.map((pk) => computePoolId(pk));
}
