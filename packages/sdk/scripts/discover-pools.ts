/**
 * Discover ETH/USDC Pools Script
 * 
 * Discovers all initialized ETH/USDC pools on Unichain Sepolia by
 * enumerating standard fee tier configurations and checking their
 * initialization status on-chain.
 * 
 * Usage:
 *   npx ts-node packages/sdk/scripts/discover-pools.ts
 */

import {
    discoverEthUsdcPools,
    findBestPool,
    TOKEN_ADDRESSES,
    STANDARD_FEE_TIERS,
    type DiscoveredPool,
} from '../src/utils/pool-discovery';
import type { ChainKey } from '../src/config/networks';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CHAIN: ChainKey = 'unichainSepolia';

// =============================================================================
// Pretty Printing Helpers
// =============================================================================

/**
 * Format a number with commas for thousands separators.
 */
function formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Pad a string to a fixed width, truncating if necessary.
 */
function padString(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
    if (str.length > width) {
        return str.slice(0, width - 1) + '…';
    }
    
    const padding = width - str.length;
    switch (align) {
        case 'right':
            return ' '.repeat(padding) + str;
        case 'center':
            const left = Math.floor(padding / 2);
            const right = padding - left;
            return ' '.repeat(left) + str + ' '.repeat(right);
        default:
            return str + ' '.repeat(padding);
    }
}

/**
 * Print the header banner.
 */
function printHeader(chainKey: ChainKey): void {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║           ETH/USDC Pool Discovery - Unichain Sepolia             ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('');
    
    const addresses = TOKEN_ADDRESSES[chainKey];
    if (addresses) {
        console.log('Token Addresses:');
        console.log(`  Native ETH: ${addresses.nativeEth}`);
        console.log(`  USDC:       ${addresses.usdc}`);
        console.log('');
    }
}

/**
 * Print results in a table format.
 */
function printPoolsTable(pools: DiscoveredPool[]): void {
    console.log(`Checking ${pools.length} fee tier configurations...`);
    console.log('');
    
    // Table header
    console.log('┌─────────┬────────────────┬─────────────────────┬────────────────┐');
    console.log('│ Fee     │ Status         │ Price               │ Liquidity      │');
    console.log('├─────────┼────────────────┼─────────────────────┼────────────────┤');
    
    // Table rows
    for (const pool of pools) {
        const fee = padString(pool.feePercent, 7);
        
        let status: string;
        let price: string;
        let liquidity: string;
        
        if (pool.initialized) {
            status = padString('✓ Initialized', 14);
            price = padString(`$${formatNumber(pool.price)}/ETH`, 19);
            liquidity = padString(pool.liquidityDepth, 14);
        } else {
            status = padString('Not Init', 14);
            price = padString('-', 19);
            liquidity = padString('-', 14);
        }
        
        console.log(`│ ${fee} │ ${status} │ ${price} │ ${liquidity} │`);
    }
    
    console.log('└─────────┴────────────────┴─────────────────────┴────────────────┘');
    console.log('');
}

/**
 * Print detailed information about initialized pools.
 */
function printDetailedPools(pools: DiscoveredPool[]): void {
    const initialized = pools.filter(p => p.initialized);
    
    if (initialized.length === 0) {
        console.log('No initialized pools found.');
        console.log('');
        console.log('To initialize a pool, run:');
        console.log('  npx ts-node packages/sdk/scripts/initialize-pool.ts');
        return;
    }
    
    console.log(`Found ${initialized.length} initialized pool(s):`);
    console.log('');
    
    for (const pool of initialized) {
        console.log(`  ${pool.feePercent} Pool:`);
        console.log(`    Pool ID:      ${pool.poolId}`);
        console.log(`    Price:        $${formatNumber(pool.price)}/ETH`);
        console.log(`    Tick:         ${pool.tick}`);
        console.log(`    sqrtPriceX96: ${pool.sqrtPriceX96.toString()}`);
        console.log(`    Liquidity:    ${pool.liquidity.toString()} (${pool.liquidityDepth})`);
        console.log('');
    }
}

/**
 * Print the best pool recommendation.
 */
function printBestPool(pools: DiscoveredPool[]): void {
    const best = findBestPool(pools);
    
    if (!best) {
        return;
    }
    
    console.log('┌──────────────────────────────────────────────────────────────────┐');
    console.log('│  RECOMMENDED POOL                                                │');
    console.log('├──────────────────────────────────────────────────────────────────┤');
    console.log(`│  Fee:         ${best.feePercent.padEnd(52)}│`);
    console.log(`│  Pool ID:     ${best.poolId.slice(0, 52).padEnd(52)}│`);
    console.log(`│               ${best.poolId.slice(52).padEnd(52)}│`);
    console.log(`│  Price:       $${formatNumber(best.price)}/ETH`.padEnd(67) + '│');
    console.log(`│  Liquidity:   ${best.liquidityDepth.padEnd(52)}│`);
    console.log('└──────────────────────────────────────────────────────────────────┘');
    console.log('');
}

// =============================================================================
// Main Function
// =============================================================================

async function main(): Promise<DiscoveredPool[]> {
    const chainKey = DEFAULT_CHAIN;
    
    printHeader(chainKey);
    
    try {
        // Discover all pools
        console.log('Querying on-chain state...');
        console.log('');
        
        const pools = await discoverEthUsdcPools(chainKey);
        
        // Print results
        printPoolsTable(pools);
        printDetailedPools(pools);
        printBestPool(pools);
        
        // Return initialized pools for programmatic use
        return pools.filter(p => p.initialized);
    } catch (error) {
        console.error('');
        console.error('┌──────────────────────────────────────────────────────────────────┐');
        console.error('│  ERROR: Failed to discover pools                                 │');
        console.error('├──────────────────────────────────────────────────────────────────┤');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const truncated = errorMessage.slice(0, 62);
        console.error(`│  ${truncated.padEnd(62)}│`);
        console.error('└──────────────────────────────────────────────────────────────────┘');
        
        throw error;
    }
}

// =============================================================================
// Exports and Execution
// =============================================================================

export { main as discoverPools };

// Run if executed directly
if (require.main === module) {
    main()
        .then((initializedPools) => {
            const exitCode = initializedPools.length > 0 ? 0 : 1;
            process.exit(exitCode);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(2);
        });
}
