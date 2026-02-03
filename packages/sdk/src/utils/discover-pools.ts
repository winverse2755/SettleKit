import 'dotenv/config';
import { createPublicClient, http, parseAbi } from 'viem';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';

// StateView contract - helps query pools
const STATE_VIEW_ABI = parseAbi([
  'function getPoolInfo(bytes32 id) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getPoolLiquidity(bytes32 id) view returns (uint128 liquidity)',
]);

// Common token pairs to check
const COMMON_PAIRS = [
  {
    name: 'USDC/WETH',
    token0: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
    token1: UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
  },
  {
    name: 'WETH/USDC',
    token0: UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
    token1: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
  },
];

const COMMON_FEES = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
const COMMON_TICK_SPACINGS: Record<number, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

async function discoverPools() {
  console.log('🔍 Discovering Existing Pools on Unichain Sepolia\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
  });

  const foundPools: any[] = [];

  for (const pair of COMMON_PAIRS) {
    for (const fee of COMMON_FEES) {
      const tickSpacing = COMMON_TICK_SPACINGS[fee];
      
      // Generate pool key
      const poolKey = {
        currency0: pair.token0,
        currency1: pair.token1,
        fee,
        tickSpacing,
        hooks: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      };

      // Compute pool ID
      const { computePoolId } = await import('./poolKey');
      const poolId = computePoolId(poolKey);

      try {
        // Check if pool exists by querying state
        const poolInfo = await publicClient.readContract({
          address: UNICHAIN_SEPOLIA_CONFIG.contracts.stateView,
          abi: STATE_VIEW_ABI,
          functionName: 'getPoolInfo',
          args: [poolId],
        }) as [bigint, number, number, number];

        const [sqrtPriceX96, tick, protocolFee, lpFee] = poolInfo;

        if (sqrtPriceX96 > 0n) {
          // Pool exists!
          const liquidity = await publicClient.readContract({
            address: UNICHAIN_SEPOLIA_CONFIG.contracts.stateView,
            abi: STATE_VIEW_ABI,
            functionName: 'getPoolLiquidity',
            args: [poolId],
          }) as bigint;

          foundPools.push({
            pair: pair.name,
            fee: `${fee / 10000}%`,
            tickSpacing,
            liquidity: liquidity.toString(),
            sqrtPriceX96: sqrtPriceX96.toString(),
            tick,
            poolId,
          });

          console.log(`✅ FOUND: ${pair.name} (${fee / 10000}%)`);
          console.log(`   Pool ID: ${poolId}`);
          console.log(`   Liquidity: ${liquidity.toString()}`);
          console.log(`   Tick: ${tick}`);
          console.log(`   Price (sqrtPriceX96): ${sqrtPriceX96.toString()}`);
          console.log('');
        }
      } catch (error) {
        // Pool doesn't exist or error querying - skip silently
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Summary: Found ${foundPools.length} existing pool(s)\n`);

  if (foundPools.length === 0) {
    console.log('❌ No existing pools found for USDC/WETH pairs');
    console.log('\n💡 Options:');
    console.log('   1. Check Uniswap interface (app.uniswap.org) in testnet mode');
    console.log('   2. Add liquidity to your initialized pool');
    console.log('   3. Try different token pairs');
  } else {
    console.log('✅ You can potentially swap on these pools!');
    console.log('\n📋 Pool Details:');
    foundPools.forEach((pool, i) => {
      console.log(`\n${i + 1}. ${pool.pair} (${pool.fee})`);
      console.log(`   Pool ID: ${pool.poolId}`);
      console.log(`   Liquidity: ${pool.liquidity}`);
      console.log(`   Has liquidity: ${pool.liquidity !== '0' ? 'YES ✅' : 'NO ❌'}`);
    });
    
    console.log('\n💡 Pools with liquidity > 0 are ready for swaps!');
  }
}

discoverPools().catch(console.error);