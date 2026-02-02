import { Address } from 'viem';

/**
 * Sort two token addresses to determine token0 and token1
 * Uniswap v4 requires token0 < token1
 */
export function sortTokens(tokenA: Address, tokenB: Address): {
  token0: Address;
  token1: Address;
  sorted: boolean;
} {
  const sorted = tokenA.toLowerCase() < tokenB.toLowerCase();
  
  return {
    token0: sorted ? tokenA : tokenB,
    token1: sorted ? tokenB : tokenA,
    sorted,
  };
}

/**
 * Calculate sqrtPriceX96 for a given price
 * For 1:1 price: sqrtPriceX96 = sqrt(1) * 2^96 = 2^96
 * For price P: sqrtPriceX96 = sqrt(P) * 2^96
 * 
 * @param price - Price of token1 in terms of token0 (how much token0 for 1 token1)
 * @returns sqrtPriceX96 as bigint
 */
export function calculateSqrtPriceX96(price: number = 1): bigint {
  // For 1:1 price ratio
  if (price === 1) {
    return 79228162514264337593543950336n; // sqrt(1) * 2^96
  }
  
  // For other prices: sqrt(price) * 2^96
  const sqrtPrice = Math.sqrt(price);
  const Q96 = 2n ** 96n;
  
  // Convert to bigint (approximation)
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

/**
 * Get tick from sqrtPriceX96
 * This is approximate - for display purposes
 */
export function sqrtPriceX96ToTick(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96) / Number(Q96);
  const sqrtPrice = price * price;
  
  // tick = log_1.0001(price)
  const tick = Math.log(sqrtPrice) / Math.log(1.0001);
  return Math.floor(tick);
}

/**
 * Display token pair information
 */
export function displayTokenInfo(
  token0: Address,
  token1: Address,
  token0Symbol: string,
  token1Symbol: string
) {
  console.log('\n📊 Token Pair Information:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0Symbol} (${token0})`);
  console.log(`Token1: ${token1Symbol} (${token1})`);
  console.log(`Sorted: ${token0.toLowerCase() < token1.toLowerCase() ? '✅' : '⚠️ Needs sorting'}`);
  console.log('═══════════════════════════════════════════════════\n');
}