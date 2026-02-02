import 'dotenv/config';
import { createPublicClient, http, parseAbi, Address } from 'viem';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';
import { sortTokens } from './token-helper';
import { encodePacked, keccak256 } from 'viem';

const CONFIG = {
  USDC: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc as Address,
  WETH: UNICHAIN_SEPOLIA_CONFIG.contracts.weth as Address,
  POOL_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager as Address,
  FEE: 3000,
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
};

const POOL_MANAGER_ABI = parseAbi([
  'function getSlot0(bytes32 id) view returns (uint160,int24,uint24,uint24)',
  'function getLiquidity(bytes32 id) view returns (uint128)',
]);

async function checkPool() {
  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(process.env.UNICHAIN_RPC_URL),
  });

  const { token0, token1 } = sortTokens(CONFIG.USDC, CONFIG.WETH);
  
  const encoded = encodePacked(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK]
  );
  const poolId = keccak256(encoded);

  console.log('🔍 Checking pool liquidity...\n');
  console.log('Pool ID:', poolId);

  try {
    const slot0 = await publicClient.readContract({
      address: CONFIG.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    }) as readonly [bigint, number, number, number];

    console.log('✅ Pool initialized!');
    console.log('sqrtPriceX96:', slot0[0].toString());
    console.log('Current tick:', slot0[1]);

    const liquidity = await publicClient.readContract({
      address: CONFIG.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'getLiquidity',
      args: [poolId],
    }) as bigint;

    console.log('\n💧 Liquidity:', liquidity.toString());
    
    if (liquidity === 0n) {
      console.log('\n❌ NO LIQUIDITY IN POOL!');
      console.log('You need to add liquidity before swapping.');
      console.log('Run: npx tsx packages/sdk/src/utils/add-liquidity.ts');
    } else {
      console.log('\n✅ Pool has liquidity! Swap should work.');
    }
  } catch (error) {
    console.log('❌ Pool not found or error:', error);
  }
}

checkPool().catch(console.error);