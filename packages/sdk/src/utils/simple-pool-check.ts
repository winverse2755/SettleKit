import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodePacked,
  keccak256,
  Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';
import { sortTokens, calculateSqrtPriceX96 } from './token-helper';

const CONFIG = {
  USDC: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc as Address,
  WETH: UNICHAIN_SEPOLIA_CONFIG.contracts.weth as Address,
  POOL_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager as Address,
  POSITION_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.positionManager as Address,
  FEE: 3000,
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  INITIAL_PRICE: 1,
};

const POOL_MANAGER_ABI = parseAbi([
  'function getSlot0(bytes32 id) view returns (uint160,int24,uint24,uint24)',
]);

function computePoolId(
  token0: Address,
  token1: Address,
  fee: number,
  tickSpacing: number,
  hooks: Address
): `0x${string}` {
  const encoded = encodePacked(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [token0, token1, fee, tickSpacing, hooks]
  );
  return keccak256(encoded);
}

async function isPoolInitialized(
  publicClient: any,
  poolId: `0x${string}`
): Promise<boolean> {
  try {
    const slot0 = await publicClient.readContract({
      address: CONFIG.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    }) as readonly [bigint, number, number, number];
    
    return slot0[0] > 0n;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 Uniswap V4 Pool Initialization (Simplified)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in .env');
  }
  
  const account = privateKeyToAccount(privateKey);
  
  console.log('Creating clients...');
  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http(),
  });
  
  console.log('👛 Wallet:', account.address);
  
  // Test connection
  console.log('\n🔍 Testing network connection...');
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Connected! Block: ${blockNumber}`);
  } catch (error: any) {
    console.error('❌ Network error:', error.message);
    console.log('\n💡 Check your internet connection or RPC endpoint');
    return;
  }
  
  const { token0, token1, sorted } = sortTokens(CONFIG.USDC, CONFIG.WETH);
  
  console.log('\n📊 Pool Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0} ${sorted ? '(USDC)' : '(WETH)'}`);
  console.log(`Token1: ${token1} ${sorted ? '(WETH)' : '(USDC)'}`);
  console.log(`Fee: ${CONFIG.FEE / 10000}%`);
  console.log(`Tick Spacing: ${CONFIG.TICK_SPACING}`);
  console.log('═══════════════════════════════════════════════════');
  
  const poolId = computePoolId(token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK);
  console.log(`\n🆔 Pool ID: ${poolId}`);
  
  console.log('\n🔍 Checking if pool exists...');
  const poolExists = await isPoolInitialized(publicClient, poolId);
  console.log(`📍 Pool Status: ${poolExists ? '✅ Already initialized' : '⚠️  Not initialized'}`);
  
  if (poolExists) {
    console.log('\n✅ Pool is already initialized! You can proceed to add liquidity.');
    return;
  }
  
  console.log('\n⚠️  Pool needs to be initialized.');
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔧 INITIALIZATION OPTIONS:');
  console.log('═══════════════════════════════════════════════════');
  console.log('\nOption 1: Use PositionManager.initializePool()');
  console.log('  - Requires correct ABI');
  console.log('  - Need to verify contract interface\n');
  
  console.log('Option 2: Use a deployment script from Uniswap v4-periphery');
  console.log('  - More reliable');
  console.log('  - Uses official contracts\n');
  
  console.log('Option 3: Initialize via Uniswap v4 interface/frontend');
  console.log('  - Easiest for testing');
  console.log('  - Then come back to add liquidity programmatically\n');
  
  console.log('💡 RECOMMENDATION FOR HACKATHON:');
  console.log('Check the PositionManager contract on block explorer:');
  console.log(`🔗 https://sepolia.uniscan.xyz/address/${CONFIG.POSITION_MANAGER}`);
  console.log('\nLook for "Write Contract" tab to see available functions.');
  console.log('This will show us the exact function signature to use.\n');
  
  // Let's try to get the PositionManager interface
  console.log('🔍 Checking PositionManager contract...');
  try {
    const code = await publicClient.getBytecode({
      address: CONFIG.POSITION_MANAGER,
    });
    
    if (!code || code === '0x') {
      console.log('❌ No contract deployed at PositionManager address!');
      console.log('You may need to deploy PositionManager first.');
    } else {
      console.log('✅ PositionManager contract exists');
      console.log('\nPlease check the contract on block explorer to see');
      console.log('what functions are available for initialization.');
    }
  } catch (error: any) {
    console.error('Error checking contract:', error.message);
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exit(1);
});