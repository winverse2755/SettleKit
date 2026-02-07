// packages/sdk/src/utils/pool-utils.ts
// Uniswap v4 pool query helpers using viem

// Re-export pool discovery utilities
export {
    discoverPools,
    discoverEthUsdcPools,
    computePoolId,
    generatePoolKeys,
    findBestPool,
    feeToPercent,
    sqrtPriceX96ToPrice,
    STANDARD_FEE_TIERS,
    TOKEN_ADDRESSES,
    type PoolKey,
    type DiscoveredPool,
    type FeeTierConfig,
} from './pool-discovery';

import {
    createPublicClient,
    http,
    type Address,
    type PublicClient,
    getContract,
    type GetContractReturnType,
    encodeAbiParameters,
    keccak256,
} from 'viem';
import { CHAINS, type ChainKey } from '../config/networks';

// Uniswap v4 pools mapping storage slot
const POOLS_SLOT = 6n;

// Uniswap v4 Pool Manager ABI
// We use extsload to directly read pool state from storage
const POOL_MANAGER_ABI = [
    {
        name: 'extsload',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'slot', type: 'bytes32' }],
        outputs: [{ name: 'value', type: 'bytes32' }],
    },
    {
        name: 'initialize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' },
                ],
            },
            { name: 'sqrtPriceX96', type: 'uint160' },
        ],
        outputs: [{ name: 'tick', type: 'int24' }],
    },
] as const;

// Uniswap v4 Pool Manager addresses per chain
const POOL_MANAGER_ADDRESSES: Partial<Record<ChainKey, Address>> = {
    unichainSepolia: '0x00b036b58a818b1bc34d502d3fe730db729e62ac', // Unichain Sepolia Pool Manager
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
 * Fetch pool state directly from the PoolManager contract using extsload.
 * 
 * This uses direct storage queries instead of the StateView lens contract,
 * which has proven more reliable on certain chains.
 * 
 * Storage layout for Uniswap v4 pools:
 * - slot0 (256 bits): sqrtPriceX96 (160) | tick (24, signed) | protocolFee (24) | lpFee (24)
 * - slot1 (256 bits): liquidity (128)
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

    // Compute the storage slot for this pool's state
    // slot = keccak256(abi.encode(poolId, POOLS_SLOT))
    const poolStateSlot = keccak256(
        encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'uint256' }],
            [poolId, POOLS_SLOT]
        )
    );

    // Compute slot for liquidity (slot0 + 1)
    const liquiditySlot = ('0x' + (BigInt(poolStateSlot) + 1n).toString(16).padStart(64, '0')) as `0x${string}`;

    // Fetch slot0 and liquidity slot in parallel using extsload
    const [slot0Data, slot1Data] = await Promise.all([
        client.readContract({
            address: poolManagerAddress,
            abi: POOL_MANAGER_ABI,
            functionName: 'extsload',
            args: [poolStateSlot],
        }),
        client.readContract({
            address: poolManagerAddress,
            abi: POOL_MANAGER_ABI,
            functionName: 'extsload',
            args: [liquiditySlot],
        }),
    ]);

    // Parse slot0: sqrtPriceX96 (160 bits) | tick (24 bits signed) | protocolFee (24 bits) | lpFee (24 bits)
    const slot0Value = BigInt(slot0Data);
    const sqrtPriceX96 = slot0Value & ((1n << 160n) - 1n);
    
    // Extract tick (24 bits signed, starting at bit 160)
    const tickRaw = Number((slot0Value >> 160n) & ((1n << 24n) - 1n));
    // Convert to signed int24: if bit 23 is set, it's negative
    const tick = tickRaw >= 0x800000 ? tickRaw - 0x1000000 : tickRaw;
    
    // Extract protocolFee (24 bits, starting at bit 184)
    const protocolFee = Number((slot0Value >> 184n) & ((1n << 24n) - 1n));
    
    // Extract lpFee (24 bits, starting at bit 208)
    const lpFee = Number((slot0Value >> 208n) & ((1n << 24n) - 1n));

    // Parse slot1: liquidity (128 bits)
    const liquidity = BigInt(slot1Data) & ((1n << 128n) - 1n);

    return {
        sqrtPriceX96,
        tick,
        liquidity,
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

/**
 * Pool initialization status with detailed information
 */
export interface PoolInitializationStatus {
    initialized: boolean;
    sqrtPriceX96: bigint;
    tick: number;
    liquidity: bigint;
    price: number;
}

/**
 * Check if a Uniswap v4 pool is initialized.
 * A pool is initialized when sqrtPriceX96 > 0.
 * 
 * If the pool doesn't exist or the query reverts, returns initialized=false.
 */
export async function isPoolInitialized(
    poolId: `0x${string}`,
    chainKey: ChainKey = 'unichainSepolia'
): Promise<PoolInitializationStatus> {
    try {
        const state = await getPoolState(poolId, chainKey);
        const initialized = state.sqrtPriceX96 > 0n;
        
        let price = 0;
        if (initialized) {
            const Q96 = 2n ** 96n;
            const sqrtPrice = Number(state.sqrtPriceX96) / Number(Q96);
            price = sqrtPrice * sqrtPrice;
        }

        return {
            initialized,
            sqrtPriceX96: state.sqrtPriceX96,
            tick: state.tick,
            liquidity: state.liquidity,
            price,
        };
    } catch (error) {
        // If the extsload query fails, the pool doesn't exist or isn't initialized
        // Return a "not initialized" status
        return {
            initialized: false,
            sqrtPriceX96: 0n,
            tick: 0,
            liquidity: 0n,
            price: 0,
        };
    }
}

/**
 * Get the Pool Manager address for a given chain
 */
export function getPoolManagerAddress(chainKey: ChainKey = 'unichainSepolia'): Address {
    const address = POOL_MANAGER_ADDRESSES[chainKey];
    if (!address) {
        throw new Error(`Pool Manager address not configured for chain: ${chainKey}`);
    }
    return address;
}
