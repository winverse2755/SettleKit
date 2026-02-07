/**
 * Pool Discovery Utilities for Uniswap v4
 * 
 * Since Uniswap v4 doesn't have a pool registry, this module enumerates
 * known fee tier configurations, computes pool IDs, and checks which
 * pools are initialized on-chain.
 */

import {
    type Address,
    encodeAbiParameters,
    keccak256,
} from 'viem';
import { type ChainKey } from '../config/networks';
import { isPoolInitialized, type PoolInitializationStatus } from './pool-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Uniswap v4 Pool Key - uniquely identifies a pool
 */
export interface PoolKey {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
}

/**
 * Fee tier configuration
 */
export interface FeeTierConfig {
    fee: number;
    tickSpacing: number;
}

/**
 * A discovered pool with initialization status and additional metadata
 */
export interface DiscoveredPool {
    poolId: `0x${string}`;
    poolKey: PoolKey;
    initialized: boolean;
    sqrtPriceX96: bigint;
    tick: number;
    liquidity: bigint;
    price: number;                              // Human-readable price (e.g., ETH price in USDC)
    feePercent: string;                         // e.g., "0.30%"
    liquidityDepth: 'deep' | 'moderate' | 'shallow' | 'none';
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Standard Uniswap v4 fee tier configurations
 * 
 * | Fee   | Fee % | Tick Spacing | Use Case                     |
 * | ----- | ----- | ------------ | ---------------------------- |
 * | 100   | 0.01% | 1            | Stable pairs                 |
 * | 500   | 0.05% | 10           | Stable pairs, low volatility |
 * | 3000  | 0.30% | 60           | Most pairs (default)         |
 * | 10000 | 1.00% | 200          | Exotic/volatile pairs        |
 */
export const STANDARD_FEE_TIERS: readonly FeeTierConfig[] = [
    { fee: 100, tickSpacing: 1 },      // 0.01% - Stable pairs
    { fee: 500, tickSpacing: 10 },     // 0.05% - Stable/low volatility
    { fee: 3000, tickSpacing: 60 },    // 0.30% - Most pairs (default)
    { fee: 10000, tickSpacing: 200 },  // 1.00% - Exotic/volatile
] as const;

/**
 * Token addresses per supported chain
 */
export const TOKEN_ADDRESSES: Partial<Record<ChainKey, { nativeEth: Address; usdc: Address }>> = {
    unichainSepolia: {
        nativeEth: '0x0000000000000000000000000000000000000000',
        usdc: '0x31d0220469e10c4e71834a79b1f276d740d3768f',
    },
} as const;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Compute the Uniswap v4 pool ID from a pool key.
 * 
 * The pool ID is the keccak256 hash of the ABI-encoded pool key:
 * keccak256(abi.encode(currency0, currency1, fee, tickSpacing, hooks))
 * 
 * @param poolKey - The pool key containing currency0, currency1, fee, tickSpacing, and hooks
 * @returns The pool ID as a bytes32 hex string
 * 
 * @example
 * const poolId = computePoolId({
 *     currency0: '0x0000000000000000000000000000000000000000',
 *     currency1: '0x31d0220469e10c4e71834a79b1f276d740d3768f',
 *     fee: 3000,
 *     tickSpacing: 60,
 *     hooks: '0x0000000000000000000000000000000000000000',
 * });
 */
export function computePoolId(poolKey: PoolKey): `0x${string}` {
    const encoded = encodeAbiParameters(
        [
            { type: 'address' },
            { type: 'address' },
            { type: 'uint24' },
            { type: 'int24' },
            { type: 'address' },
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

/**
 * Generate pool keys for all standard fee tiers for a given token pair.
 * 
 * In Uniswap v4, currency0 must be lexicographically smaller than currency1.
 * This function automatically orders the tokens correctly.
 * 
 * @param tokenA - First token address
 * @param tokenB - Second token address
 * @param hooks - Optional hooks address (defaults to zero address)
 * @returns Array of pool keys for all standard fee tiers
 * 
 * @example
 * const poolKeys = generatePoolKeys(
 *     '0x0000000000000000000000000000000000000000', // ETH
 *     '0x31d0220469e10c4e71834a79b1f276d740d3768f', // USDC
 * );
 */
export function generatePoolKeys(
    tokenA: Address,
    tokenB: Address,
    hooks: Address = '0x0000000000000000000000000000000000000000'
): PoolKey[] {
    // Ensure currency0 < currency1 (lexicographic ordering)
    const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];

    return STANDARD_FEE_TIERS.map(tier => ({
        currency0,
        currency1,
        fee: tier.fee,
        tickSpacing: tier.tickSpacing,
        hooks,
    }));
}

/**
 * Convert fee to human-readable percentage string.
 * 
 * @param fee - Fee in units of 1/1,000,000 (e.g., 3000 = 0.30%)
 * @returns Fee as a percentage string (e.g., "0.30%")
 */
export function feeToPercent(fee: number): string {
    return `${(fee / 10000).toFixed(2)}%`;
}

/**
 * Convert sqrtPriceX96 to human-readable price.
 * 
 * For ETH/USDC pairs where ETH is currency0 and USDC is currency1:
 * - Raw price = (sqrtPriceX96 / 2^96)^2
 * - Adjusted price = rawPrice * 10^(decimals0 - decimals1) = rawPrice * 10^12
 * 
 * @param sqrtPriceX96 - The sqrt price in Q64.96 format
 * @param decimals0 - Decimals of currency0 (default 18 for ETH)
 * @param decimals1 - Decimals of currency1 (default 6 for USDC)
 * @returns Human-readable price (e.g., price of ETH in USDC terms)
 */
export function sqrtPriceX96ToPrice(
    sqrtPriceX96: bigint,
    decimals0: number = 18,
    decimals1: number = 6
): number {
    if (sqrtPriceX96 === 0n) return 0;
    
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const rawPrice = sqrtPrice * sqrtPrice;
    
    // Adjust for decimal difference: multiply by 10^(decimals0 - decimals1)
    const decimalAdjustment = Math.pow(10, decimals0 - decimals1);
    return rawPrice * decimalAdjustment;
}

/**
 * Assess liquidity depth category based on liquidity amount.
 * 
 * @param liquidity - Pool liquidity value
 * @returns Category: 'deep', 'moderate', 'shallow', or 'none'
 */
function assessLiquidityDepth(liquidity: bigint): 'deep' | 'moderate' | 'shallow' | 'none' {
    if (liquidity === 0n) return 'none';
    
    // Thresholds based on typical pool sizes
    // These are relative measures - actual significance depends on token decimals
    const DEEP_THRESHOLD = 10n ** 18n * 1000000n;     // 1M units
    const MODERATE_THRESHOLD = 10n ** 18n * 100000n;  // 100K units
    const SHALLOW_THRESHOLD = 10n ** 18n * 1000n;     // 1K units

    if (liquidity >= DEEP_THRESHOLD) return 'deep';
    if (liquidity >= MODERATE_THRESHOLD) return 'moderate';
    if (liquidity >= SHALLOW_THRESHOLD) return 'shallow';
    return 'shallow'; // Any non-zero liquidity is at least shallow
}

/**
 * Create a DiscoveredPool from a pool key and its initialization status.
 */
function createDiscoveredPool(
    poolKey: PoolKey,
    poolId: `0x${string}`,
    status: PoolInitializationStatus
): DiscoveredPool {
    // Calculate price adjusted for ETH/USDC decimals
    const price = sqrtPriceX96ToPrice(status.sqrtPriceX96);
    
    return {
        poolId,
        poolKey,
        initialized: status.initialized,
        sqrtPriceX96: status.sqrtPriceX96,
        tick: status.tick,
        liquidity: status.liquidity,
        price,
        feePercent: feeToPercent(poolKey.fee),
        liquidityDepth: status.initialized ? assessLiquidityDepth(status.liquidity) : 'none',
    };
}

/**
 * Discover all pools for a given token pair across all standard fee tiers.
 * 
 * This function generates pool keys for all fee tiers, computes their IDs,
 * checks on-chain initialization status, and returns detailed information
 * about each pool.
 * 
 * @param tokenA - First token address
 * @param tokenB - Second token address
 * @param chainKey - Chain to query (defaults to unichainSepolia)
 * @param hooks - Optional hooks address
 * @returns Array of discovered pools with their status
 * 
 * @example
 * const pools = await discoverPools(
 *     '0x0000000000000000000000000000000000000000', // ETH
 *     '0x31d0220469e10c4e71834a79b1f276d740d3768f', // USDC
 *     'unichainSepolia'
 * );
 */
export async function discoverPools(
    tokenA: Address,
    tokenB: Address,
    chainKey: ChainKey = 'unichainSepolia',
    hooks: Address = '0x0000000000000000000000000000000000000000'
): Promise<DiscoveredPool[]> {
    // Generate pool keys for all fee tiers
    const poolKeys = generatePoolKeys(tokenA, tokenB, hooks);
    
    // Compute pool IDs
    const poolsWithIds = poolKeys.map(poolKey => ({
        poolKey,
        poolId: computePoolId(poolKey),
    }));
    
    // Check initialization status for all pools in parallel
    const statusResults = await Promise.all(
        poolsWithIds.map(({ poolId }) => isPoolInitialized(poolId, chainKey))
    );
    
    // Combine into DiscoveredPool objects
    return poolsWithIds.map(({ poolKey, poolId }, index) => 
        createDiscoveredPool(poolKey, poolId, statusResults[index])
    );
}

/**
 * Discover all ETH/USDC pools on a given chain.
 * 
 * This is a convenience function that uses predefined ETH and USDC addresses
 * for the specified chain.
 * 
 * @param chainKey - Chain to query (defaults to unichainSepolia)
 * @returns Array of discovered ETH/USDC pools
 * @throws If token addresses are not configured for the chain
 * 
 * @example
 * const pools = await discoverEthUsdcPools('unichainSepolia');
 * const initialized = pools.filter(p => p.initialized);
 */
export async function discoverEthUsdcPools(
    chainKey: ChainKey = 'unichainSepolia'
): Promise<DiscoveredPool[]> {
    const addresses = TOKEN_ADDRESSES[chainKey];
    
    if (!addresses) {
        throw new Error(`Token addresses not configured for chain: ${chainKey}`);
    }
    
    return discoverPools(addresses.nativeEth, addresses.usdc, chainKey);
}

/**
 * Find the best initialized pool from a list of discovered pools.
 * 
 * Selection criteria (in order of priority):
 * 1. Must be initialized
 * 2. Prefer deeper liquidity
 * 3. Prefer lower fees for similar liquidity
 * 
 * @param pools - Array of discovered pools
 * @returns The best pool, or null if no pools are initialized
 */
export function findBestPool(pools: DiscoveredPool[]): DiscoveredPool | null {
    const initialized = pools.filter(p => p.initialized);
    
    if (initialized.length === 0) return null;
    
    // Sort by liquidity (descending), then by fee (ascending)
    const sorted = initialized.sort((a, b) => {
        // First compare liquidity depth
        const depthOrder = { deep: 3, moderate: 2, shallow: 1, none: 0 };
        const depthDiff = depthOrder[b.liquidityDepth] - depthOrder[a.liquidityDepth];
        if (depthDiff !== 0) return depthDiff;
        
        // Then compare actual liquidity
        if (b.liquidity > a.liquidity) return 1;
        if (b.liquidity < a.liquidity) return -1;
        
        // Finally compare fees (prefer lower)
        return a.poolKey.fee - b.poolKey.fee;
    });
    
    return sorted[0];
}
