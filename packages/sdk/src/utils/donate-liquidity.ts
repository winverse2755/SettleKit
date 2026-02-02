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
  POOL_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager as Address,
  POOL_DONATE_TEST: '0xF8c8c496a3B8f71BbF475A4E457380e6c1a0Fc3e' as Address, // PoolDonateTest
  FEE: 3000,
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  USDC_AMOUNT: '5', // 5 USDC
  WETH_AMOUNT: '0.002', // 0.002 WETH
};

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]);

const POOL_DONATE_ABI = parseAbi([
  'function donate((address,address,uint24,int24,address) key, uint256 amount0, uint256 amount1, bytes hookData) external payable returns (int256)',
]);

async function donateLiquidity() {
  console.log('🎁 Donating Liquidity to Uniswap V4 Pool');
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
  console.log(`Donating: ${CONFIG.USDC_AMOUNT} USDC + ${CONFIG.WETH_AMOUNT} WETH`);
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
  
  // Approve both tokens
  console.log('\n🔐 Approving tokens for PoolManager...');
  
  for (const [token, name] of [
    [CONFIG.USDC, 'USDC'],
    [CONFIG.WETH, 'WETH']
  ] as const) {
    const approvalAmount = parseUnits('1000000', name === 'USDC' ? 6 : 18);
    
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONFIG.POOL_MANAGER, approvalAmount],
    });
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    
    const hash = await walletClient.sendTransaction({
      account,
      to: token,
      data,
      gasPrice,
      nonce,
      chain: unichainSepolia,
    });
    
    console.log(`📤 ${name} approval: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ ${name} approved!`);
  }
  
  // Donate liquidity
  console.log('\n🎁 Donating liquidity...');
  console.log('═══════════════════════════════════════════════════');
  
  const poolKey = [token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK] as const;
  
  // Amounts to donate (in correct token order)
  let amount0, amount1;
  if (sorted) {
    amount0 = usdcAmount; // Token0 is USDC
    amount1 = wethAmount; // Token1 is WETH
  } else {
    amount0 = wethAmount; // Token0 is WETH
    amount1 = usdcAmount; // Token1 is USDC
  }
  
  console.log(`Amount0: ${formatUnits(amount0, sorted ? 6 : 18)}`);
  console.log(`Amount1: ${formatUnits(amount1, sorted ? 18 : 6)}`);
  
  const data = encodeFunctionData({
    abi: POOL_DONATE_ABI,
    functionName: 'donate',
    args: [poolKey, amount0, amount1, '0x' as `0x${string}`],
  });
  
  console.log('⛽ Estimating gas...');
  
  try {
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: CONFIG.POOL_DONATE_TEST,
      data,
    });
    
    console.log(`Gas estimate: ${gasEstimate}`);
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    
    console.log('📝 Signing and sending transaction...');
    const hash = await walletClient.sendTransaction({
      account,
      to: CONFIG.POOL_DONATE_TEST,
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
      console.log('\n✅ Liquidity donated successfully!');
      console.log('The pool now has liquidity for swaps!');
    } else {
      throw new Error('Failed to donate liquidity');
    }
  } catch (error: any) {
    console.error('\n❌ Error donating liquidity:');
    console.error('Message:', error.shortMessage || error.message);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    throw error;
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Liquidity donation complete!');
  console.log('Next step: Run swap script');
  console.log('═══════════════════════════════════════════════════\n');
}

donateLiquidity().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exit(1);
});