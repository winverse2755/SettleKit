import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  parseAbi,
  Address,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';
import { sortTokens } from './token-helper';

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  // Tokens
  USDC: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc as Address,
  WETH: UNICHAIN_SEPOLIA_CONFIG.contracts.weth as Address,
  
  // Contracts
  POOL_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager as Address,
  POOL_SWAP_TEST: '0x9140a78c1a137c7ff1c151ec8231272af78a99a4' as Address,
  
  // Pool parameters
  FEE: 3000,
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  
  // Swap amount
  SWAP_AMOUNT_USDC: '1', // 1 USDC
};

// ========================================
// ABIs
// ========================================
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);

const POOL_SWAP_TEST_ABI = parseAbi([
  'function swap((address,address,uint24,int24,address) key, (bool,int256,uint160) params, bytes hookData) external payable returns (int256)',
]);

// ========================================
// HELPER FUNCTIONS
// ========================================

async function checkAndApproveToken(
  publicClient: any,
  walletClient: any,
  account: any,
  token: Address,
  spender: Address,
  amount: bigint,
  tokenName: string
) {
  console.log(`\n🔍 Checking ${tokenName} allowance...`);
  
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, spender],
  }) as bigint;
  
  console.log(`Current allowance: ${formatUnits(allowance, tokenName === 'USDC' ? 6 : 18)}`);
  
  if (allowance < amount) {
    console.log(`⚠️  Insufficient allowance - approving ${tokenName}...`);
    
    const approvalAmount = parseUnits('1000000', 6); // 1 million USDC
    
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, approvalAmount],
    });
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    
    // Sign and send with explicit parameters
    const hash = await walletClient.sendTransaction({
      account,
      to: token,
      data,
      gasPrice,
      nonce,
      chain: unichainSepolia,
    });
    
    console.log(`📤 Approval transaction: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ ${tokenName} approved!`);
  } else {
    console.log(`✅ ${tokenName} already approved`);
  }
}

// ========================================
// MAIN FUNCTION
// ========================================
async function main() {
  console.log('🔄 Uniswap V4 Swap via PoolSwapTest');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Setup
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error('PRIVATE_KEY not found');
  
  const rpcUrl = process.env.UNICHAIN_RPC_URL;
  if (!rpcUrl) throw new Error('UNICHAIN_RPC_URL not found');
  
  console.log('🔗 Using RPC:', rpcUrl.substring(0, 50) + '...');
  
  const account = privateKeyToAccount(privateKey);
  
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
  
  const blockNumber = await publicClient.getBlockNumber();
  console.log('✅ Connected - Block:', blockNumber);
  
  // Sort tokens
  const { token0, token1, sorted } = sortTokens(CONFIG.USDC, CONFIG.WETH);
  const zeroForOne = sorted;
  
  console.log('\n📊 Swap Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0} ${sorted ? '(USDC)' : '(WETH)'}`);
  console.log(`Token1: ${token1} ${sorted ? '(WETH)' : '(USDC)'}`);
  console.log(`Direction: ${zeroForOne ? 'USDC → WETH' : 'WETH → USDC'}`);
  console.log(`Amount: ${CONFIG.SWAP_AMOUNT_USDC} USDC`);
  console.log('═══════════════════════════════════════════════════');
  
  const swapAmount = parseUnits(CONFIG.SWAP_AMOUNT_USDC, 6);
  
  // Check balances
  const usdcBalance = await publicClient.readContract({
    address: CONFIG.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  const wethBalance = await publicClient.readContract({
    address: CONFIG.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  console.log(`\n💰 Current Balances:`);
  console.log(`USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`WETH: ${formatUnits(wethBalance, 18)}`);
  
  if (usdcBalance < swapAmount) {
    throw new Error(`Insufficient USDC! Have: ${formatUnits(usdcBalance, 6)}, Need: ${CONFIG.SWAP_AMOUNT_USDC}`);
  }
  
  // Approve
  await checkAndApproveToken(
    publicClient,
    walletClient,
    account,
    CONFIG.USDC,
    CONFIG.POOL_SWAP_TEST,
    swapAmount,
    'USDC'
  );
  
  // ========================================
  // Execute Swap
  // ========================================
  console.log('\n🔄 Executing Swap...');
  console.log('═══════════════════════════════════════════════════');
  
  const poolKeyArray = [token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK] as const;
  
  const swapParamsArray = [
    zeroForOne,
    -BigInt(swapAmount),
    zeroForOne 
      ? BigInt('4295128739')
      : BigInt('1461446703485210103287273052203988822378723970342')
  ] as const;
  
  const hookData = '0x' as `0x${string}`;
  
  try {
    console.log('⚙️  Preparing swap transaction...');
    console.log(`Swapping ${formatUnits(swapAmount, 6)} USDC for WETH...`);
    
    const data = encodeFunctionData({
      abi: POOL_SWAP_TEST_ABI,
      functionName: 'swap',
      args: [poolKeyArray, swapParamsArray, hookData],
    });
    
    console.log('⛽ Estimating gas...');
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: CONFIG.POOL_SWAP_TEST,
      data,
    });
    
    console.log(`Gas estimate: ${gasEstimate}`);
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    
    console.log('📝 Signing and sending transaction...');
    const hash = await walletClient.sendTransaction({
      account,
      to: CONFIG.POOL_SWAP_TEST,
      data,
      gas: gasEstimate + BigInt(50000),
      gasPrice,
      nonce,
      chain: unichainSepolia,
    });
    
    console.log(`\n📤 Transaction sent: ${hash}`);
    console.log(`🔗 Explorer: https://sepolia.uniscan.xyz/tx/${hash}`);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Swap executed successfully!\n');
      
      const finalUsdcBalance = await publicClient.readContract({
        address: CONFIG.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      }) as bigint;
      
      const finalWethBalance = await publicClient.readContract({
        address: CONFIG.WETH,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      }) as bigint;
      
      console.log('📊 Final Balances:');
      console.log(`USDC: ${formatUnits(finalUsdcBalance, 6)} (Change: ${formatUnits(finalUsdcBalance - usdcBalance, 6)})`);
      console.log(`WETH: ${formatUnits(finalWethBalance, 18)} (Change: +${formatUnits(finalWethBalance - wethBalance, 18)})`);
    } else {
      throw new Error('Swap failed');
    }
  } catch (error: any) {
    console.error('\n❌ Error executing swap:');
    console.error('Message:', error.shortMessage || error.message);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    throw error;
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Swap complete!');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal Error:', error.message || error);
  process.exit(1);
});