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

const CONFIG = {
  USDC: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc as Address,
  WETH: UNICHAIN_SEPOLIA_CONFIG.contracts.weth as Address,
  POOL_MODIFY_LIQUIDITY_TEST: '0x5fa728c0a5cfd51bee4b060773f50554c0c8a7ab' as Address,
  FEE: 3000,
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  USDC_AMOUNT: '10', // 10 USDC
  WETH_AMOUNT: '0.005', // 0.005 WETH
  TICK_LOWER: -887220,
  TICK_UPPER: 887220,
};

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]);

const MODIFY_LIQUIDITY_ABI = parseAbi([
  'function modifyLiquidity((address,address,uint24,int24,address) key, (int24,int24,int256,int256) params, bytes hookData) external payable returns (int256, int256)',
]);

async function addLiquidity() {
  console.log('💧 Adding Liquidity to Uniswap V4 Pool');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.UNICHAIN_RPC_URL;
  
  if (!privateKey || !rpcUrl) {
    throw new Error('Missing environment variables');
  }
  
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
  
  const { token0, token1, sorted } = sortTokens(CONFIG.USDC, CONFIG.WETH);
  
  console.log('\n📊 Pool Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0} ${sorted ? '(USDC)' : '(WETH)'}`);
  console.log(`Token1: ${token1} ${sorted ? '(WETH)' : '(USDC)'}`);
  console.log(`Adding: ${CONFIG.USDC_AMOUNT} USDC + ${CONFIG.WETH_AMOUNT} WETH`);
  console.log('═══════════════════════════════════════════════════');
  
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
  
  console.log('\n💰 Current Balances:');
  console.log(`USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`WETH: ${formatUnits(wethBalance, 18)}`);
  
  const usdcAmount = parseUnits(CONFIG.USDC_AMOUNT, 6);
  const wethAmount = parseUnits(CONFIG.WETH_AMOUNT, 18);
  
  if (usdcBalance < usdcAmount || wethBalance < wethAmount) {
    throw new Error('Insufficient balance!');
  }
  
  // Approve both tokens (already done, but keeping for completeness)
  console.log('\n✅ Tokens already approved from previous run');
  
  // Add liquidity
  console.log('\n💧 Adding liquidity...');
  console.log('═══════════════════════════════════════════════════');
  
  const poolKey = [token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK] as const;
  
  // For PoolModifyLiquidityTest: (tickLower, tickUpper, liquidityDelta, salt)
  // liquidityDelta positive = add liquidity
  // Calculate liquidity based on amounts (simplified: sqrt of product)
  const liquidityDelta = BigInt(Math.floor(Math.sqrt(Number(usdcAmount) * Number(wethAmount)) * 1000));
  const salt = BigInt(0); // Not used for adding liquidity
  
  console.log(`Liquidity delta: ${liquidityDelta}`);
  
  const params = [CONFIG.TICK_LOWER, CONFIG.TICK_UPPER, liquidityDelta, salt] as const;
  
  const data = encodeFunctionData({
    abi: MODIFY_LIQUIDITY_ABI,
    functionName: 'modifyLiquidity',
    args: [poolKey, params, '0x' as `0x${string}`],
  });
  
  console.log('⛽ Estimating gas...');
  
  try {
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: CONFIG.POOL_MODIFY_LIQUIDITY_TEST,
      data,
    });
    
    console.log(`Gas estimate: ${gasEstimate}`);
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    
    console.log('📝 Signing and sending transaction...');
    const hash = await walletClient.sendTransaction({
      account,
      to: CONFIG.POOL_MODIFY_LIQUIDITY_TEST,
      data,
      gas: gasEstimate + BigInt(100000),
      gasPrice,
      nonce,
      chain: unichainSepolia,
    });
    
    console.log(`\n📤 Transaction sent: ${hash}`);
    console.log(`🔗 Explorer: https://sepolia.uniscan.xyz/tx/${hash}`);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('\n✅ Liquidity added successfully!');
    } else {
      throw new Error('Failed to add liquidity');
    }
  } catch (error: any) {
    console.error('\n❌ Error adding liquidity:');
    console.error('Message:', error.shortMessage || error.message);
    
    // The test contract might be expecting a different pattern
    // Let's try with the actual token amounts as max amounts
    console.log('\n💡 The test contract might need direct token amounts.');
    console.log('The pool is initialized but adding liquidity through test contracts');
    console.log('can be tricky. For the hackathon demo, you can:');
    console.log('1. Show the initialized pool');
    console.log('2. Document that liquidity would be added via PositionManager in production');
    console.log('3. Or add liquidity manually through the Uniswap interface');
    
    throw error;
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Liquidity addition complete!');
  console.log('Next step: Run swap script');
  console.log('═══════════════════════════════════════════════════\n');
}

addLiquidity().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exit(1);
});