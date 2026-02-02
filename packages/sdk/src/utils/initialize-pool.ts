import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodePacked,
  keccak256,
  parseAbi,
  Address,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';
import { sortTokens, calculateSqrtPriceX96 } from './token-helper';

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  // Tokens
  USDC: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc as Address,
  WETH: UNICHAIN_SEPOLIA_CONFIG.contracts.weth as Address,
  
  // Contracts
  POOL_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager as Address,
  POSITION_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.positionManager as Address,
  
  // Pool parameters
  FEE: 3000, // 0.3% fee
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  
  // Price (1 WETH = 1 USDC for simplicity)
  INITIAL_PRICE: 1,
};

// ========================================
// ABIs
// ========================================
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);

const POOL_MANAGER_ABI = parseAbi([
  'function getSlot0(bytes32 id) view returns (uint160,int24,uint24,uint24)',
]);

const POSITION_MANAGER_ABI = parseAbi([
  'function initializePool((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) payable returns (int24)',
]);

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Compute Pool ID from pool key
 */
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

/**
 * Check if pool is initialized
 */
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

/**
 * Get pool state
 */
async function getPoolState(publicClient: any, poolId: `0x${string}`) {
  try {
    const slot0 = await publicClient.readContract({
      address: CONFIG.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    }) as readonly [bigint, number, number, number];
    
    return {
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
      protocolFee: slot0[2],
      lpFee: slot0[3],
    };
  } catch (error) {
    console.error('Error getting pool state:', error);
    return null;
  }
}

// ========================================
// MAIN FUNCTION
// ========================================
async function main() {
  console.log('🚀 Uniswap V4 Pool Initialization');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Validate environment variables
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in .env');
  }

  const rpcUrl = process.env.UNICHAIN_RPC_URL;
  if (!rpcUrl) {
    throw new Error('UNICHAIN_RPC_URL not found in .env - please add your Alchemy RPC URL');
  }

  console.log('🔗 Using RPC:', rpcUrl.substring(0, 50) + '...');
  
  const account = privateKeyToAccount(privateKey);
  
  // Create clients with explicit RPC URL
  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(rpcUrl),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http(rpcUrl),
  });
  
  console.log('👛 Wallet:', account.address);
  
  // Test connection
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log('✅ Connected to network - Block:', blockNumber);
  } catch (error: any) {
    console.error('❌ Failed to connect to RPC:', error.message);
    console.log('\n💡 Please check:');
    console.log('1. Your .env file has UNICHAIN_RPC_URL set correctly');
    console.log('2. No spaces around the = sign in .env');
    console.log('3. Your Alchemy API key is valid');
    throw error;
  }
  
  // Sort tokens
  const { token0, token1, sorted } = sortTokens(CONFIG.USDC, CONFIG.WETH);
  
  console.log('\n📊 Pool Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0} ${sorted ? '(USDC)' : '(WETH)'}`);
  console.log(`Token1: ${token1} ${sorted ? '(WETH)' : '(USDC)'}`);
  console.log(`Fee: ${CONFIG.FEE / 10000}%`);
  console.log(`Tick Spacing: ${CONFIG.TICK_SPACING}`);
  console.log(`Hook: ${CONFIG.HOOK}`);
  console.log('═══════════════════════════════════════════════════');
  
  // Compute pool ID
  const poolId = computePoolId(token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK);
  console.log(`\n🆔 Pool ID: ${poolId}`);
  
  // Check if pool exists
  const poolExists = await isPoolInitialized(publicClient, poolId);
  console.log(`📍 Pool Status: ${poolExists ? '✅ Already initialized' : '⚠️  Not initialized'}`);
  
  if (poolExists) {
    console.log('\n✅ Pool already initialized!');
    const state = await getPoolState(publicClient, poolId);
    if (state) {
      console.log('\n📊 Current Pool State:');
      console.log(`sqrtPriceX96: ${state.sqrtPriceX96}`);
      console.log(`Current Tick: ${state.tick}`);
      console.log(`LP Fee: ${state.lpFee}`);
    }
    return;
  }
  
  // ========================================
  // Initialize pool via PositionManager
  // ========================================
  console.log('\n🏗️  Initializing pool via PositionManager...');
  console.log('═══════════════════════════════════════════════════');
  
  const sqrtPriceX96 = calculateSqrtPriceX96(CONFIG.INITIAL_PRICE);
  console.log(`Initial Price: 1 WETH = ${CONFIG.INITIAL_PRICE} USDC`);
  console.log(`sqrtPriceX96: ${sqrtPriceX96}`);
  
  try {
    console.log('\n⚙️  Preparing transaction...');
    
    // Encode the function call
    const data = encodeFunctionData({
      abi: POSITION_MANAGER_ABI,
      functionName: 'initializePool',
      args: [
        [token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK],
        sqrtPriceX96,
      ],
    });
    
    // Get gas estimate
    console.log('⛽ Estimating gas...');
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: CONFIG.POSITION_MANAGER,
      data,
    });
    
    console.log(`Gas estimate: ${gasEstimate}`);
    
    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();
    console.log(`Gas price: ${gasPrice}`);
    
    // Get nonce
    const nonce = await publicClient.getTransactionCount({
      address: account.address,
    });
    
    // Send transaction using sendTransaction (which signs locally)
    console.log('📝 Signing and sending transaction...');
    const hash = await walletClient.sendTransaction({
      to: CONFIG.POSITION_MANAGER,
      data,
      gas: gasEstimate + BigInt(50000), // Add buffer
      gasPrice: gasPrice,
      nonce,
      account,
    });
    
    console.log(`\n📤 Transaction sent: ${hash}`);
    console.log(`🔗 Explorer: https://sepolia.uniscan.xyz/tx/${hash}`);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Pool initialized successfully!\n');
      
      // Verify pool state
      const state = await getPoolState(publicClient, poolId);
      if (state) {
        console.log('📊 Pool State After Initialization:');
        console.log(`sqrtPriceX96: ${state.sqrtPriceX96}`);
        console.log(`Current Tick: ${state.tick}`);
        console.log(`LP Fee: ${state.lpFee}`);
      }
    } else {
      throw new Error('Pool initialization failed');
    }
  } catch (error: any) {
    console.error('\n❌ Error initializing pool:');
    console.error('Message:', error.shortMessage || error.message);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    
    throw error;
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Pool initialization complete!');
  console.log('Next step: Run add-liquidity script to provide liquidity');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal Error:', error.message || error);
  process.exit(1);
});