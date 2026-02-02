// packages/sdk/src/utils/pool-utils.ts
// Uniswap v4 pool query helpers using viem

import {
    createPublicClient,
    http,
    type Address,
    type PublicClient,
    getContract,
    type GetContractReturnType,
} from 'viem';
import { unichainSepolia, CHAINS, type ChainKey } from '../config/networks';

// Uniswap v4 Pool Manager ABI (relevant functions for pool queries)
const POOL_MANAGER_ABI = [
    {
        name: 'getSlot0',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'bytes32' }],
        outputs: [
            { name: 'sqrtPriceX96', type: 'uint160' },
            { name: 'tick', type: 'int24' },
            { name: 'protocolFee', type: 'uint24' },
            { name: 'lpFee', type: 'uint24' },
        ],
    },
    {
        name: 'getLiquidity',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'bytes32' }],
        outputs: [{ name: 'liquidity', type: 'uint128' }],
    },
    {
        name: 'getPosition',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'poolId', type: 'bytes32' },
            { name: 'owner', type: 'address' },
            { name: 'tickLower', type: 'int24' },
            { name: 'tickUpper', type: 'int24' },
            { name: 'salt', type: 'bytes32' },
        ],
        outputs: [
            { name: 'liquidity', type: 'uint128' },
            { name: 'feeGrowthInside0LastX128', type: 'uint256' },
            { name: 'feeGrowthInside1LastX128', type: 'uint256' },
        ],
    },
    {
        name: 'extsload',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'slot', type: 'bytes32' }],
        outputs: [{ name: 'value', type: 'bytes32' }],
    },
] as const;

// Uniswap v4 Pool Manager addresses per chain
const POOL_MANAGER_ADDRESSES: Partial<Record<ChainKey, Address>> = {
    unichainSepolia: '0x4529A01c7A0410167c5740C487A8DE60232617bf', // Unichain Sepolia Pool Manager
};

// Pool state interface
export interface PoolState {
    sqrtPriceX96: bigint;
    tick: number;
    liquidity: bigint;
    protocolFee: number;
    lpFee: number;
}

// Extended pool info with additional computed data
export interface PoolInfo extends PoolState {
    poolId: string;
    chain: ChainKey;
    price: number; // Human-readable price derived from sqrtPriceX96
    liquidityDepth: 'deep' | 'moderate' | 'shallow';
}

// Client cache for reusing connections
const clientCache = new Map<ChainKey, PublicClient>();

/**
 * Get or create a public client for the specified chain
 */
export function getPublicClient(chainKey: ChainKey): PublicClient {
    const cached = clientCache.get(chainKey);
    if (cached) return cached;

    const chain = CHAINS[chainKey];
    const client = createPublicClient({
        chain,
        transport: http(),
    });

    clientCache.set(chainKey, client);
    return client;
}

/**
 * Get the Pool Manager contract instance for a given chain
 */
export function getPoolContract(
    chainKey: ChainKey = 'unichainSepolia'
): GetContractReturnType<typeof POOL_MANAGER_ABI, PublicClient> {
    const address = POOL_MANAGER_ADDRESSES[chainKey];

    if (!address) {
        throw new Error(`Pool Manager address not configured for chain: ${chainKey}`);
    }

    const client = getPublicClient(chainKey);

    return getContract({
        address,
        abi: POOL_MANAGER_ABI,
        client,
    });
}

/**
 * Fetch pool state from the Uniswap v4 Pool Manager
 * 
 * @param poolId - The pool ID (bytes32)
 * @param chainKey - The chain to query (defaults to unichainSepolia)
 * @returns Pool state including liquidity, sqrtPriceX96, tick, and fees
 */
export async function getPoolState(
    poolId: `0x${string}`,
    chainKey: ChainKey = 'unichainSepolia'
): Promise<PoolState> {
    const client = getPublicClient(chainKey);
    const poolManagerAddress = POOL_MANAGER_ADDRESSES[chainKey];

    if (!poolManagerAddress) {
        throw new Error(`Pool Manager address not configured for chain: ${chainKey}`);
    }

    // Fetch slot0 and liquidity in parallel
    const [slot0Result, liquidityResult] = await Promise.all([
        client.readContract({
            address: poolManagerAddress,
            abi: POOL_MANAGER_ABI,
            functionName: 'getSlot0',
            args: [poolId],
        }),
        client.readContract({
            address: poolManagerAddress,
            abi: POOL_MANAGER_ABI,
            functionName: 'getLiquidity',
            args: [poolId],
        }),
    ]);

    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0Result;

    return {
        sqrtPriceX96,
        tick,
        liquidity: liquidityResult,
        protocolFee,
        lpFee,
    };
}

/**
 * Get extended pool information including computed metrics
 * 
 * @param poolId - The pool ID (bytes32)
 * @param chainKey - The chain to query
 * @returns Extended pool info with price and liquidity depth assessment
 */
export async function getPoolInfo(
    poolId: `0x${string}`,
    chainKey: ChainKey = 'unichainSepolia'
): Promise<PoolInfo> {
    const state = await getPoolState(poolId, chainKey);

    // Calculate human-readable price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(state.sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    // Assess liquidity depth based on liquidity value
    // These thresholds can be adjusted based on expected pool sizes
    const liquidityDepth = assessLiquidityDepth(state.liquidity);

    return {
        ...state,
        poolId,
        chain: chainKey,
        price,
        liquidityDepth,
    };
}

/**
 * Assess liquidity depth category based on liquidity amount
 */
function assessLiquidityDepth(liquidity: bigint): 'deep' | 'moderate' | 'shallow' {
    // Thresholds in liquidity units (adjust based on token decimals and expected volumes)
    const DEEP_THRESHOLD = 10n ** 18n * 1000000n; // 1M units
    const MODERATE_THRESHOLD = 10n ** 18n * 100000n; // 100K units

    if (liquidity >= DEEP_THRESHOLD) return 'deep';
    if (liquidity >= MODERATE_THRESHOLD) return 'moderate';
    return 'shallow';
}

/**
 * Calculate estimated slippage for a given trade amount
 * Uses the constant product formula approximation
 * 
 * @param liquidity - Pool liquidity
 * @param amountIn - Trade amount (as string to handle big numbers)
 * @param sqrtPriceX96 - Current sqrt price
 * @returns Estimated slippage as a decimal (e.g., 0.01 for 1%)
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

    // Simplified slippage estimation using x * y = k model
    // slippage ≈ amountIn / (2 * liquidity) for small trades
    // This is an approximation; real slippage depends on tick ranges
    const Q96 = 2n ** 96n;

    // Convert liquidity to a comparable scale
    const effectiveLiquidity = (liquidity * sqrtPriceX96) / Q96;

    if (effectiveLiquidity === 0n) {
        return 1;
    }

    const slippage = Number(amount) / (2 * Number(effectiveLiquidity));

    // Cap slippage at 100%
    return Math.min(slippage, 1);
}

/**
 * Calculate price impact for a given trade
 * 
 * @param liquidity - Pool liquidity
 * @param amountIn - Trade amount
 * @param sqrtPriceX96 - Current sqrt price
 * @returns Price impact as a decimal (e.g., 0.005 for 0.5%)
 */
export function calculatePriceImpact(
    liquidity: bigint,
    amountIn: string,
    sqrtPriceX96: bigint
): number {
    const amount = BigInt(amountIn);

    if (liquidity === 0n) {
        return 1; // 100% impact if no liquidity
    }

    // Price impact in Uniswap v3/v4 concentrated liquidity:
    // For a swap of amount dx in token0:
    // New sqrt price: sqrt(P') = sqrt(P) + dx / L
    // Price impact = (P' - P) / P

    const Q96 = 2n ** 96n;

    // Calculate new sqrt price after the trade
    // This is simplified - actual calculation depends on swap direction and tick ranges
    const deltaSqrtPrice = (amount * Q96) / liquidity;
    const newSqrtPriceX96 = sqrtPriceX96 + deltaSqrtPrice;

    // Calculate price impact
    const oldPrice = Number(sqrtPriceX96) / Number(Q96);
    const newPrice = Number(newSqrtPriceX96) / Number(Q96);

    const priceImpact = Math.abs((newPrice * newPrice - oldPrice * oldPrice) / (oldPrice * oldPrice));

    // Cap at 100%
    return Math.min(priceImpact, 1);
}

/**
 * Get pool state with retry logic for network resilience
 * 
 * @param poolId - The pool ID
 * @param chainKey - The chain to query
 * @param maxRetries - Maximum retry attempts
 * @returns Pool state or throws after max retries
 */
export async function getPoolStateWithRetry(
    poolId: `0x${string}`,
    chainKey: ChainKey = 'unichainSepolia',
    maxRetries: number = 3
): Promise<PoolState> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await getPoolState(poolId, chainKey);
        } catch (error) {
            lastError = error as Error;
            // Exponential backoff: 100ms, 200ms, 400ms
            const backoffMs = 100 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }

    throw new Error(`Failed to fetch pool state after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Batch fetch multiple pool states
 * 
 * @param poolIds - Array of pool IDs
 * @param chainKey - The chain to query
 * @returns Map of pool ID to pool state
 */
export async function batchGetPoolStates(
    poolIds: `0x${string}`[],
    chainKey: ChainKey = 'unichainSepolia'
): Promise<Map<string, PoolState>> {
    const results = await Promise.allSettled(
        poolIds.map(poolId => getPoolState(poolId, chainKey))
    );

    const poolStates = new Map<string, PoolState>();

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            poolStates.set(poolIds[index], result.value);
        }
    });

    return poolStates;
}
