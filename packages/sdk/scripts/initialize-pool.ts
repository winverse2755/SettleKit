/**
 * Initialize Uniswap v4 Pool Script
 * 
 * Checks if a Uniswap v4 pool is initialized and initializes it if needed.
 * A pool is initialized when sqrtPriceX96 > 0.
 * 
 * Usage:
 *   npx ts-node packages/sdk/scripts/initialize-pool.ts
 * 
 * Environment variables required:
 *   PRIVATE_KEY - Wallet private key for signing the transaction
 */

import { 
    createWalletClient, 
    createPublicClient,
    http, 
    type Address,
    type Hash,
    encodeAbiParameters,
    keccak256,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { resolve } from 'path';
import { isPoolInitialized, getPoolManagerAddress } from '../src/utils/pool-utils';
import { unichainSepolia } from '../src/config/networks';

// Load environment variables from the SDK package .env
config({ path: resolve(__dirname, '../.env') });

// Pool Manager ABI - initialize function and extsload for direct state query
const POOL_MANAGER_ABI = [
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
                ]
            },
            { name: 'sqrtPriceX96', type: 'uint160' },
        ],
        outputs: [{ name: 'tick', type: 'int24' }],
    },
    {
        name: 'extsload',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'slot', type: 'bytes32' }],
        outputs: [{ name: 'value', type: 'bytes32' }],
    },
] as const;

// Pool errors for better error handling
const POOL_ERRORS = [
    {
        name: 'PoolAlreadyInitialized',
        type: 'error',
        inputs: [],
    },
    {
        name: 'PoolNotInitialized',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TickSpacingTooLarge',
        type: 'error',
        inputs: [{ name: 'tickSpacing', type: 'int24' }],
    },
    {
        name: 'TickSpacingTooSmall',
        type: 'error',
        inputs: [{ name: 'tickSpacing', type: 'int24' }],
    },
] as const;

// Pool configuration - IMPORTANT: Pool ID is computed from pool key
// The pool ID should be derived from the pool key, not hardcoded
// The computed ID from the pool key below is: 0x1927686e9757bb312fc499e480536d466c788dcdc86a1b62c82643157f05b603

// Pool key components (must match the pool ID)
const POOL_KEY = {
    currency0: '0x0000000000000000000000000000000000000000' as Address, // NATIVE (ETH)
    currency1: '0x31d0220469e10c4e71834a79b1f276d740d3768f' as Address, // USDC
    fee: 3000,        // 0.30%
    tickSpacing: 60,
    hooks: '0x0000000000000000000000000000000000000000' as Address,
};

/**
 * Calculate sqrtPriceX96 for a given ETH price in USDC
 * 
 * In Uniswap v4:
 * - token0 = ETH (18 decimals)
 * - token1 = USDC (6 decimals)
 * - price = token1/token0 in raw units
 * 
 * For 1 ETH = ethPriceInUsdc USDC:
 * - raw price = (ethPriceInUsdc * 10^6) / (1 * 10^18)
 * - sqrtPriceX96 = sqrt(raw price) * 2^96
 * 
 * @param ethPriceInUsdc - Price of 1 ETH in USDC (e.g., 2500 for $2500)
 * @returns sqrtPriceX96 as bigint
 */
function calculateSqrtPriceX96(ethPriceInUsdc: number): bigint {
    // raw price = price * 10^(decimals1 - decimals0) = price * 10^(6 - 18) = price * 10^-12
    const rawPrice = ethPriceInUsdc * 1e-12;
    
    // sqrtPrice = sqrt(rawPrice)
    const sqrtPrice = Math.sqrt(rawPrice);
    
    // sqrtPriceX96 = sqrtPrice * 2^96
    const Q96 = 2n ** 96n;
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));
    
    return sqrtPriceX96;
}

/**
 * Convert sqrtPriceX96 back to human-readable price (ETH in USDC)
 */
function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const rawPrice = sqrtPrice * sqrtPrice;
    // Convert from raw to human price: price = rawPrice / 10^-12 = rawPrice * 10^12
    return rawPrice * 1e12;
}

// Default initial price: 1 ETH = 2500 USDC
const DEFAULT_ETH_PRICE_USDC = 2500;

/**
 * Compute the Uniswap v4 pool ID from pool key parameters.
 * The pool ID is calculated as keccak256(abi.encode(poolKey)).
 */
function computePoolId(poolKey: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
}): `0x${string}` {
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

interface InitializeResult {
    success: boolean;
    txHash?: Hash;
    tick?: number;
    error?: string;
}

/**
 * Initialize the Uniswap v4 pool if not already initialized
 */
async function initializePool(ethPriceInUsdc: number = DEFAULT_ETH_PRICE_USDC): Promise<InitializeResult> {
    // Validate private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('PRIVATE_KEY environment variable is required');
    }

    // Ensure private key has 0x prefix
    const formattedPrivateKey = privateKey.startsWith('0x') 
        ? privateKey as `0x${string}` 
        : `0x${privateKey}` as `0x${string}`;

    // Create account from private key
    const account = privateKeyToAccount(formattedPrivateKey);
    
    // Create clients
    const publicClient = createPublicClient({
        chain: unichainSepolia,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: unichainSepolia,
        transport: http(),
    });

    const poolManagerAddress = getPoolManagerAddress('unichainSepolia');

    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║           Uniswap v4 Pool Initialization                         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Compute pool ID from pool key
    const poolId = computePoolId(POOL_KEY);
    console.log('Pool Configuration:');
    console.log(`  Pool ID (computed): ${poolId}`);
    console.log('');
    console.log(`  Currency0 (ETH):  ${POOL_KEY.currency0}`);
    console.log(`  Currency1 (USDC): ${POOL_KEY.currency1}`);
    console.log(`  Fee:              ${POOL_KEY.fee} (${POOL_KEY.fee / 10000}%)`);
    console.log(`  Tick Spacing:     ${POOL_KEY.tickSpacing}`);
    console.log(`  Hooks:            ${POOL_KEY.hooks}`);
    console.log('');
    console.log(`Pool Manager: ${poolManagerAddress}`);
    console.log(`Chain: Unichain Sepolia (${unichainSepolia.id})`);
    console.log(`Wallet: ${account.address}`);
    console.log('');

    // Check current initialization status via StateView
    console.log('Checking pool initialization status via StateView...');
    const status = await isPoolInitialized(poolId, 'unichainSepolia');
    
    // Also try direct extsload query to PoolManager
    console.log('');
    console.log('Checking directly via PoolManager.extsload...');
    let directSqrtPriceX96 = 0n;
    let directTick = 0;
    try {
        // In Uniswap v4, the pools mapping is at slot 6
        // Pool state slot = keccak256(poolId . uint256(6))
        // Slot0 is at that location
        const POOLS_SLOT = 6n;
        const poolStateSlot = keccak256(
            encodeAbiParameters(
                [{ type: 'bytes32' }, { type: 'uint256' }],
                [poolId, POOLS_SLOT]
            )
        );
        
        const slot0Value = await publicClient.readContract({
            address: poolManagerAddress,
            abi: POOL_MANAGER_ABI,
            functionName: 'extsload',
            args: [poolStateSlot],
        });
        
        // slot0 packs: sqrtPriceX96 (160 bits) + tick (24 bits) + protocolFee (24 bits) + lpFee (24 bits)
        // Total: 232 bits stored in a 256-bit slot
        const slot0BigInt = BigInt(slot0Value);
        directSqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);
        // tick is next 24 bits (signed)
        const tickRaw = Number((slot0BigInt >> 160n) & 0xFFFFFFn);
        directTick = tickRaw > 0x7FFFFF ? tickRaw - 0x1000000 : tickRaw; // Handle signed int24
        
        console.log(`  Slot0 raw value: ${slot0Value}`);
        console.log(`  sqrtPriceX96 from extsload: ${directSqrtPriceX96}`);
        console.log(`  Tick from extsload: ${directTick}`);
        console.log(`  Pool initialized (extsload): ${directSqrtPriceX96 > 0n ? 'YES' : 'NO'}`);
        
        if (directSqrtPriceX96 > 0n) {
            const currentPrice = sqrtPriceX96ToPrice(directSqrtPriceX96);
            console.log(`  Current price: 1 ETH = $${currentPrice.toFixed(2)} USDC`);
        }
    } catch (e) {
        console.log(`  Direct query failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // Use direct extsload result as source of truth (StateView may be incorrect)
    const isActuallyInitialized = directSqrtPriceX96 > 0n;
    
    if (isActuallyInitialized) {
        console.log('');
        console.log('┌──────────────────────────────────────────────────────────────────┐');
        console.log('│  Pool is already INITIALIZED (verified via direct extsload)     │');
        console.log('├──────────────────────────────────────────────────────────────────┤');
        console.log(`│  Pool ID:      ${poolId.slice(0, 42)}...`.padEnd(68) + '│');
        console.log(`│  sqrtPriceX96: ${directSqrtPriceX96.toString().padEnd(47)}│`);
        console.log(`│  Current tick: ${directTick.toString().padEnd(47)}│`);
        console.log(`│  Price (ETH):  $${sqrtPriceX96ToPrice(directSqrtPriceX96).toFixed(2)} USDC`.padEnd(68) + '│');
        console.log('└──────────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('No action needed. Pool is ready for use.');
        
        if (!status.initialized) {
            console.log('');
            console.log('Note: StateView returned incorrect data (sqrtPriceX96=0).');
            console.log('This may be a bug in the StateView contract or query.');
        }
        
        return { 
            success: true, 
            tick: directTick,
        };
    }

    if (status.initialized) {
        console.log('');
        console.log('┌──────────────────────────────────────────────────────────────────┐');
        console.log('│  Pool is already INITIALIZED                                     │');
        console.log('├──────────────────────────────────────────────────────────────────┤');
        console.log(`│  sqrtPriceX96: ${status.sqrtPriceX96.toString().padEnd(47)}│`);
        console.log(`│  Current tick: ${status.tick.toString().padEnd(47)}│`);
        console.log(`│  Liquidity:    ${status.liquidity.toString().padEnd(47)}│`);
        console.log(`│  Price (ETH):  $${sqrtPriceX96ToPrice(status.sqrtPriceX96).toFixed(2)} USDC`.padEnd(68) + '│');
        console.log('└──────────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('No action needed. Pool is ready for use.');
        
        return { 
            success: true, 
            tick: status.tick,
        };
    }

    // Pool is not initialized - proceed with initialization
    console.log('');
    console.log('Pool is NOT initialized. Proceeding with initialization...');
    console.log('');

    // Calculate initial sqrtPriceX96
    const sqrtPriceX96 = calculateSqrtPriceX96(ethPriceInUsdc);
    const verifyPrice = sqrtPriceX96ToPrice(sqrtPriceX96);

    console.log('Initial Price Configuration:');
    console.log(`  Target Price:     1 ETH = ${ethPriceInUsdc} USDC`);
    console.log(`  sqrtPriceX96:     ${sqrtPriceX96.toString()}`);
    console.log(`  Verified Price:   1 ETH = $${verifyPrice.toFixed(2)} USDC`);
    console.log('');

    // Prepare the pool key tuple for the contract call
    const poolKeyTuple = {
        currency0: POOL_KEY.currency0,
        currency1: POOL_KEY.currency1,
        fee: POOL_KEY.fee,
        tickSpacing: POOL_KEY.tickSpacing,
        hooks: POOL_KEY.hooks,
    };

    try {
        // Simulate the transaction first to catch any errors
        console.log('Simulating transaction...');
        const { request } = await publicClient.simulateContract({
            address: poolManagerAddress,
            abi: POOL_MANAGER_ABI,
            functionName: 'initialize',
            args: [poolKeyTuple, sqrtPriceX96],
            account,
        });

        // Send the transaction
        console.log('Sending initialization transaction...');
        const txHash = await walletClient.writeContract(request);

        console.log('');
        console.log(`Transaction submitted: ${txHash}`);
        console.log(`Explorer: ${unichainSepolia.blockExplorers?.default.url}/tx/${txHash}`);
        console.log('');
        console.log('Waiting for confirmation...');

        // Wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({ 
            hash: txHash,
            confirmations: 1,
        });

        if (receipt.status === 'success') {
            console.log('');
            console.log('┌──────────────────────────────────────────────────────────────────┐');
            console.log('│  ✓ Pool INITIALIZED successfully!                                │');
            console.log('├──────────────────────────────────────────────────────────────────┤');
            console.log(`│  Transaction: ${txHash.slice(0, 42)}...`.padEnd(68) + '│');
            console.log(`│  Block:       ${receipt.blockNumber.toString().padEnd(47)}│`);
            console.log(`│  Gas Used:    ${receipt.gasUsed.toString().padEnd(47)}│`);
            console.log(`│  Price:       1 ETH = $${verifyPrice.toFixed(2)} USDC`.padEnd(68) + '│');
            console.log('└──────────────────────────────────────────────────────────────────┘');

            // Verify initialization
            console.log('');
            console.log('Verifying pool state...');
            const newStatus = await isPoolInitialized(poolId, 'unichainSepolia');
            
            if (newStatus.initialized) {
                console.log(`  sqrtPriceX96: ${newStatus.sqrtPriceX96}`);
                console.log(`  Tick:         ${newStatus.tick}`);
                console.log('  ✓ Pool initialization verified!');
            }

            return {
                success: true,
                txHash,
                tick: newStatus.tick,
            };
        } else {
            console.error('');
            console.error('┌──────────────────────────────────────────────────────────────────┐');
            console.error('│  ✗ Transaction REVERTED                                          │');
            console.error('└──────────────────────────────────────────────────────────────────┘');
            
            return {
                success: false,
                txHash,
                error: 'Transaction reverted',
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error('');
        console.error('┌──────────────────────────────────────────────────────────────────┐');
        console.error('│  ✗ Initialization FAILED                                         │');
        console.error('├──────────────────────────────────────────────────────────────────┤');
        
        // Try to extract useful error info
        if (errorMessage.includes('insufficient funds')) {
            console.error('│  Error: Insufficient ETH for gas                                 │');
            console.error(`│  Wallet: ${account.address}`.padEnd(68) + '│');
        } else if (errorMessage.includes('PoolAlreadyInitialized')) {
            console.error('│  Error: Pool is already initialized                              │');
        } else {
            console.error('│  Full error details:                                             │');
            console.error('└──────────────────────────────────────────────────────────────────┘');
            // Print full error for debugging
            console.error('\n' + errorMessage + '\n');
        }
        
        return {
            success: false,
            error: errorMessage,
        };
    }
}

// Export for programmatic use
export { initializePool, calculateSqrtPriceX96, sqrtPriceX96ToPrice, computePoolId, POOL_KEY };

// Run if executed directly
if (require.main === module) {
    // Parse optional price argument: npx ts-node initialize-pool.ts 2000
    const priceArg = process.argv[2];
    const ethPriceInUsdc = priceArg ? parseFloat(priceArg) : DEFAULT_ETH_PRICE_USDC;

    if (isNaN(ethPriceInUsdc) || ethPriceInUsdc <= 0) {
        console.error('Invalid price argument. Usage: npx ts-node initialize-pool.ts [ethPriceInUsdc]');
        console.error('Example: npx ts-node initialize-pool.ts 2500');
        process.exit(1);
    }

    initializePool(ethPriceInUsdc)
        .then((result) => {
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Fatal error:', error.message);
            process.exit(2);
        });
}
