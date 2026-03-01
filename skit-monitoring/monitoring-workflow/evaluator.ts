import type { PoolHealth } from "./types";

export function selectNextBestPool(
  currentPoolId: `0x${string}`,
  pools: PoolHealth[]
): PoolHealth | undefined {
  const candidates = pools
    .filter((pool) => pool.poolId !== currentPoolId)
    .sort((a, b) => {
      if (a.liquidity === b.liquidity) return 0;
      return a.liquidity > b.liquidity ? -1 : 1;
    });

  return candidates[0];
}
