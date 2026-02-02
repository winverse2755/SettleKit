import { Address, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * Uniswap v4 PoolKey structure
 * Must match the onchain PoolKey struct exactly
 */
export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

/**
 * Sort two token addresses to ensure currency0 < currency1
 * This is REQUIRED by Uniswap v4
 */
export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
  const a = BigInt(tokenA);
  const b = BigInt(tokenB);
  
  if (a === b) {
    throw new Error('Identical token addresses');
  }
  
  return a < b ? [tokenA, tokenB] : [tokenB, tokenA];
}

/**
 * Create a properly formatted PoolKey
 * Automatically sorts tokens and validates inputs
 */
export function createPoolKey(
  tokenA: Address,
  tokenB: Address,
  fee: number,
  tickSpacing: number,
  hooks: Address = '0x0000000000000000000000000000000000000000'
): PoolKey {
  // Sort tokens (v4 requirement)
  const [currency0, currency1] = sortTokens(tokenA, tokenB);
  
  // Validate fee (must be in basis points, 0-1000000)
  if (fee < 0 || fee > 1000000) {
    throw new Error(`Invalid fee: ${fee}. Must be 0-1000000 basis points`);
  }
  
  // Validate tick spacing (common values: 1, 10, 60, 200)
  const validTickSpacings = [1, 10, 60, 200];
  if (!validTickSpacings.includes(tickSpacing)) {
    console.warn(`Unusual tick spacing: ${tickSpacing}. Common values are ${validTickSpacings.join(', ')}`);
  }
  
  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks
  };
}

/**
 * Compute the pool ID hash
 * Used to uniquely identify a pool in Uniswap v4's PoolManager
 * 
 * Formula: keccak256(abi.encode(PoolKey))
 */
export function computePoolId(poolKey: PoolKey): `0x${string}` {
  // Encode the PoolKey struct exactly as Solidity would
  const encoded = encodeAbiParameters(
    parseAbiParameters('address, address, uint24, int24, address'),
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks
    ]
  );
  
  // Hash it to get the pool ID
  return keccak256(encoded);
}

/**
 * Determine swap direction based on input token
 * Returns true if swapping token0 -> token1 (zeroForOne)
 * Returns false if swapping token1 -> token0
 */
export function getSwapDirection(
  poolKey: PoolKey,
  tokenIn: Address
): boolean {
  const normalizedTokenIn = tokenIn.toLowerCase() as Address;
  const currency0Lower = poolKey.currency0.toLowerCase();
  const currency1Lower = poolKey.currency1.toLowerCase();
  
  if (normalizedTokenIn === currency0Lower) {
    return true; // zeroForOne = true
  } else if (normalizedTokenIn === currency1Lower) {
    return false; // zeroForOne = false
  } else {
    throw new Error(`Token ${tokenIn} is not in pool (${poolKey.currency0}, ${poolKey.currency1})`);
  }
}

/**
 * Get the output token address for a swap
 */
export function getOutputToken(
  poolKey: PoolKey,
  tokenIn: Address
): Address {
  const zeroForOne = getSwapDirection(poolKey, tokenIn);
  return zeroForOne ? poolKey.currency1 : poolKey.currency0;
}

/**
 * Format a PoolKey for logging/debugging
 */
export function formatPoolKey(poolKey: PoolKey): string {
  return `Pool(${poolKey.currency0.slice(0, 6)}.../${poolKey.currency1.slice(0, 6)}..., fee=${poolKey.fee/10000}%, spacing=${poolKey.tickSpacing})`;
}