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
  encodeAbiParameters,
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
  POSITION_MANAGER: UNICHAIN_SEPOLIA_CONFIG.contracts.positionManager as Address,
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address,
  
  // Pool parameters
  FEE: 3000, // 0.3% fee
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  
  // Liquidity amounts
  USDC_AMOUNT: '5', // 5 USDC
  WETH_AMOUNT: '0.005', // 0.005 WETH
  
  // Full range liquidity
  TICK_LOWER: -887220,
  TICK_UPPER: 887220,
};

// ========================================
// ACTION CODES
// ========================================
const Actions = {
  MINT_POSITION: '0x02',
  SETTLE_PAIR: '0x09',
};

// ========================================
// ABIs
// ========================================
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);

const PERMIT2_ABI = parseAbi([
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
]);

const POSITION_MANAGER_ABI = parseAbi([
  'function modifyLiquidities(bytes unlockData, uint256 deadline) payable',
]);

// ========================================
// HELPER FUNCTIONS
// ========================================

async function checkAndApproveToken(
  publicClient: any,
  walletClient: any,
  account: Address,
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
    args: [account, spender],
  }) as bigint;
  
  console.log(`Current allowance: ${formatUnits(allowance, tokenName === 'USDC' ? 6 : 18)}`);
  
  if (allowance < amount) {
    console.log(`⚠️  Insufficient allowance - approving ${tokenName}...`);
    
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, BigInt(2 ** 256 - 1)], // Max approval
    });
    
    const gasEstimate = await publicClient.estimateGas({
      account: account,
      to: token,
      data,
    });
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account });
    
    const hash = await walletClient.sendTransaction({
      to: token,
      data,
      gas: gasEstimate + BigInt(10000),
      gasPrice,
      nonce,
      account,
    });
    
    console.log(`📤 Approval transaction: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ ${tokenName} approved!`);
  } else {
    console.log(`✅ ${tokenName} already approved`);
  }
}

async function approvePermit2(
  publicClient: any,
  walletClient: any,
  account: Address,
  token: Address,
  positionManager: Address,
  tokenName: string
) {
  console.log(`\n🔍 Setting up Permit2 for ${tokenName}...`);
  
  try {
    const data = encodeFunctionData({
      abi: PERMIT2_ABI,
      functionName: 'approve',
      args: [
        token,
        positionManager,
        BigInt(2 ** 160 - 1), // Max amount
        BigInt(2 ** 48 - 1),  // Max expiration
      ],
    });
    
    const gasEstimate = await publicClient.estimateGas({
      account: account,
      to: CONFIG.PERMIT2,
      data,
    });
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account });
    
    const hash = await walletClient.sendTransaction({
      to: CONFIG.PERMIT2,
      data,
      gas: gasEstimate + BigInt(10000),
      gasPrice,
      nonce,
      account,
    });
    
    console.log(`📤 Permit2 approval transaction: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Permit2 approved for ${tokenName}`);
  } catch (error: any) {
    // Might already be approved
    console.log(`Note: Permit2 may already be set for ${tokenName}`);
  }
}

// ========================================
// MAIN FUNCTION
// ========================================
async function main() {
  console.log('💧 Uniswap V4 Add Liquidity');
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
  
  console.log('\n📊 Pool Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0} ${sorted ? '(USDC)' : '(WETH)'}`);
  console.log(`Token1: ${token1} ${sorted ? '(WETH)' : '(USDC)'}`);
  console.log(`Fee: ${CONFIG.FEE / 10000}%`);
  console.log('═══════════════════════════════════════════════════');
  
  // Prepare amounts
  const usdcDecimals = 6;
  const wethDecimals = 18;
  
  let amount0: bigint, amount1: bigint;
  if (sorted) {
    amount0 = parseUnits(CONFIG.USDC_AMOUNT, usdcDecimals);
    amount1 = parseUnits(CONFIG.WETH_AMOUNT, wethDecimals);
    console.log(`\nAmount0 (USDC): ${CONFIG.USDC_AMOUNT} USDC`);
    console.log(`Amount1 (WETH): ${CONFIG.WETH_AMOUNT} WETH`);
  } else {
    amount0 = parseUnits(CONFIG.WETH_AMOUNT, wethDecimals);
    amount1 = parseUnits(CONFIG.USDC_AMOUNT, usdcDecimals);
    console.log(`\nAmount0 (WETH): ${CONFIG.WETH_AMOUNT} WETH`);
    console.log(`Amount1 (USDC): ${CONFIG.USDC_AMOUNT} USDC`);
  }
  
  // Check balances
  const balance0 = await publicClient.readContract({
    address: token0,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  const balance1 = await publicClient.readContract({
    address: token1,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  console.log(`\n💰 Current Balances:`);
  console.log(`Token0: ${formatUnits(balance0, sorted ? usdcDecimals : wethDecimals)}`);
  console.log(`Token1: ${formatUnits(balance1, sorted ? wethDecimals : usdcDecimals)}`);
  
  if (balance0 < amount0 || balance1 < amount1) {
    throw new Error('Insufficient token balance!');
  }
  
  // ========================================
  // STEP 1: Approve tokens to Permit2
  // ========================================
  console.log('\n🔐 STEP 1: Token Approvals');
  console.log('═══════════════════════════════════════════════════');
  
  await checkAndApproveToken(
    publicClient,
    walletClient,
    account.address,
    token0,
    CONFIG.PERMIT2,
    amount0,
    sorted ? 'USDC' : 'WETH'
  );
  
  await checkAndApproveToken(
    publicClient,
    walletClient,
    account.address,
    token1,
    CONFIG.PERMIT2,
    amount1,
    sorted ? 'WETH' : 'USDC'
  );
  
  // ========================================
  // STEP 2: Approve PositionManager via Permit2
  // ========================================
  console.log('\n🔐 STEP 2: Permit2 Setup');
  console.log('═══════════════════════════════════════════════════');
  
  await approvePermit2(
    publicClient,
    walletClient,
    account.address,
    token0,
    CONFIG.POSITION_MANAGER,
    sorted ? 'USDC' : 'WETH'
  );
  
  await approvePermit2(
    publicClient,
    walletClient,
    account.address,
    token1,
    CONFIG.POSITION_MANAGER,
    sorted ? 'WETH' : 'USDC'
  );
  
  // ========================================
  // STEP 3: Add liquidity
  // ========================================
  console.log('\n💧 STEP 3: Adding Liquidity');
  console.log('═══════════════════════════════════════════════════');
  
  const poolKey = [token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK] as const;
  
  // Calculate liquidity (approximate)
  const liquidityToMint = BigInt(Math.floor(Math.sqrt(Number(amount0) * Number(amount1)) * 1000));
  console.log(`Liquidity to mint: ${liquidityToMint}`);
  
  // Encode MINT_POSITION action
  const actions = (Actions.MINT_POSITION + Actions.SETTLE_PAIR) as `0x${string}`;
  
  const mintParams = encodeAbiParameters(
    [
      { name: 'poolKey', type: 'tuple', components: [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
      ]},
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amount0Max', type: 'uint128' },
      { name: 'amount1Max', type: 'uint128' },
      { name: 'owner', type: 'address' },
      { name: 'hookData', type: 'bytes' },
    ],
    [poolKey, CONFIG.TICK_LOWER, CONFIG.TICK_UPPER, liquidityToMint, amount0, amount1, account.address, '0x']
  );
  
  const settleParams = encodeAbiParameters(
    [{ name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' }],
    [token0, token1]
  );
  
  const params = [mintParams, settleParams];
  const unlockData = encodeAbiParameters(
    [{ name: 'actions', type: 'bytes' }, { name: 'params', type: 'bytes[]' }],
    [actions, params]
  );
  
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
  
  try {
    console.log('⚙️  Preparing liquidity transaction...');
    
    const data = encodeFunctionData({
      abi: POSITION_MANAGER_ABI,
      functionName: 'modifyLiquidities',
      args: [unlockData, deadline],
    });
    
    console.log('⛽ Estimating gas...');
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: CONFIG.POSITION_MANAGER,
      data,
    });
    
    console.log(`Gas estimate: ${gasEstimate}`);
    
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    
    console.log('📝 Signing and sending transaction...');
    const hash = await walletClient.sendTransaction({
      to: CONFIG.POSITION_MANAGER,
      data,
      gas: gasEstimate + BigInt(100000), // Add buffer
      gasPrice,
      nonce,
      account,
    });
    
    console.log(`\n📤 Transaction sent: ${hash}`);
    console.log(`🔗 Explorer: https://sepolia.uniscan.xyz/tx/${hash}`);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Liquidity added successfully!\n');
    } else {
      throw new Error('Liquidity addition failed');
    }
  } catch (error: any) {
    console.error('\n❌ Error adding liquidity:');
    console.error('Message:', error.shortMessage || error.message);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure the pool is initialized');
    console.log('2. Check that you have sufficient token balances');
    console.log('3. Verify all approvals are set correctly');
    
    throw error;
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Liquidity addition complete!');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal Error:', error.message || error);
  process.exit(1);
});