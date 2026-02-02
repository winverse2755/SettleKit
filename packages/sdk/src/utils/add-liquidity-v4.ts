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
  encodeAbiParameters,
  Address,
  Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  USDC: '0x31d0220469e10c4E71834a79b1f276d740d3768F' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  POOL_MANAGER: '0x00b036b58a818b1bc34d502d3fe730db729e62ac' as Address,
  POSITION_MANAGER: '0xf969aee60879c54baaed9f3ed26147db216fd664' as Address,
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address,
  
  FEE: 3000,
  TICK_SPACING: 60,
  HOOK: '0x0000000000000000000000000000000000000000' as Address,
  
  USDC_AMOUNT: '5',
  WETH_AMOUNT: '0.005',
  
  TICK_LOWER: -887220,
  TICK_UPPER: 887220,
};

// ========================================
// ACTIONS
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
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

const POOL_MANAGER_ABI = parseAbi([
  'function getSlot0(bytes32 id) view returns (uint160,int24,uint24,uint24)',
]);

const POSITION_MANAGER_ABI = parseAbi([
  'function modifyLiquidities(bytes unlockData, uint256 deadline) payable',
  'function nextTokenId() external view returns (uint256)',
]);

const PERMIT2_ABI = parseAbi([
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
]);

// ========================================
// HELPER FUNCTIONS
// ========================================

function sortTokens(tokenA: Address, tokenB: Address) {
  const sorted = tokenA.toLowerCase() < tokenB.toLowerCase();
  return {
    token0: sorted ? tokenA : tokenB,
    token1: sorted ? tokenB : tokenA,
    sorted,
  };
}

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

async function checkPoolState(publicClient: any, poolId: `0x${string}`) {
  try {
    const slot0 = await publicClient.readContract({
      address: CONFIG.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    });
    
    // Explicitly convert to proper types
    const sqrtPriceX96 = slot0[0] as bigint;
    const tick = Number(slot0[1]); // Convert to number
    
    return {
      initialized: sqrtPriceX96 > 0n,
      sqrtPriceX96,
      tick,
    };
  } catch (error) {
    console.log('⚠️  Could not read pool state');
    return { initialized: true, sqrtPriceX96: 0n, tick: 0 };
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// MAIN FUNCTION
// ========================================
async function addLiquidity() {
  console.log('💧 Adding Liquidity to Uniswap V4 Pool');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in .env');
  }
  
  const account = privateKeyToAccount(privateKey);
  const rpcUrl = process.env.UNICHAIN_RPC_URL || 'https://sepolia.unichain.org';
  
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
  console.log('🌐 RPC:', rpcUrl.substring(0, 50) + '...\n');
  
  const { token0, token1, sorted } = sortTokens(CONFIG.USDC, CONFIG.WETH);
  
  console.log('📊 Pool Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Token0: ${token0} ${sorted ? '(USDC)' : '(WETH)'}`);
  console.log(`Token1: ${token1} ${sorted ? '(WETH)' : '(USDC)'}`);
  console.log(`Fee: ${CONFIG.FEE / 10000}%`);
  console.log(`Range: [${CONFIG.TICK_LOWER}, ${CONFIG.TICK_UPPER}]`);
  console.log('═══════════════════════════════════════════════════\n');
  
  const poolId = computePoolId(token0, token1, CONFIG.FEE, CONFIG.TICK_SPACING, CONFIG.HOOK);
  console.log(`🆔 Pool ID: ${poolId}`);
  console.log('⏳ Checking pool...\n');
  
  await sleep(3000);
  
  const poolState = await checkPoolState(publicClient, poolId);
  
  if (poolState.initialized && poolState.sqrtPriceX96 > 0n) {
    console.log('✅ Pool ready');
    console.log(`   Price: ${poolState.sqrtPriceX96}`);
    console.log(`   Tick: ${poolState.tick}\n`);
  } else {
    console.log('✅ Proceeding with liquidity addition\n');
  }
  
  // ========================================
  // STEP 1: Prepare amounts
  // ========================================
  console.log('💰 STEP 1: Preparing amounts...');
  
  const usdcDecimals = 6;
  const wethDecimals = 18;
  
  let amount0: bigint, amount1: bigint;
  if (sorted) {
    amount0 = parseUnits(CONFIG.USDC_AMOUNT, usdcDecimals);
    amount1 = parseUnits(CONFIG.WETH_AMOUNT, wethDecimals);
    console.log(`   USDC: ${CONFIG.USDC_AMOUNT}`);
    console.log(`   WETH: ${CONFIG.WETH_AMOUNT}`);
  } else {
    amount0 = parseUnits(CONFIG.WETH_AMOUNT, wethDecimals);
    amount1 = parseUnits(CONFIG.USDC_AMOUNT, usdcDecimals);
    console.log(`   WETH: ${CONFIG.WETH_AMOUNT}`);
    console.log(`   USDC: ${CONFIG.USDC_AMOUNT}`);
  }
  
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
  
  console.log(`\n   Balances:`);
  console.log(`   Token0: ${formatUnits(balance0, sorted ? usdcDecimals : wethDecimals)}`);
  console.log(`   Token1: ${formatUnits(balance1, sorted ? wethDecimals : usdcDecimals)}`);
  
  if (balance0 < amount0 || balance1 < amount1) {
    throw new Error('Insufficient balance!');
  }
  
  console.log('   ✅ Sufficient\n');
  
  // ========================================
  // STEP 2: Approve Permit2
  // ========================================
  console.log('🔐 STEP 2: Permit2 approvals...');
  
  for (const [token, amount, symbol] of [
    [token0, amount0, sorted ? 'USDC' : 'WETH'],
    [token1, amount1, sorted ? 'WETH' : 'USDC'],
  ] as const) {
    const allowance = await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, CONFIG.PERMIT2],
    }) as bigint;
    
    if (allowance < amount) {
      console.log(`   Approving ${symbol}...`);
      const hash = await walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONFIG.PERMIT2, BigInt(2 ** 256 - 1)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ ${symbol}`);
    } else {
      console.log(`   ✅ ${symbol} (already approved)`);
    }
  }
  
  // ========================================
  // STEP 3: Approve PositionManager
  // ========================================
  console.log('\n🔐 STEP 3: PositionManager approvals...');
  
  const deadline48 = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);
  
  for (const [token, symbol] of [
    [token0, sorted ? 'USDC' : 'WETH'],
    [token1, sorted ? 'WETH' : 'USDC'],
  ] as const) {
    try {
      const hash = await walletClient.writeContract({
        address: CONFIG.PERMIT2,
        abi: PERMIT2_ABI,
        functionName: 'approve',
        args: [token, CONFIG.POSITION_MANAGER, BigInt(2 ** 160 - 1), deadline48],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ ${symbol}`);
    } catch (error: any) {
      if (error.message?.includes('user rejected')) throw error;
      console.log(`   ✅ ${symbol} (may exist)`);
    }
  }
  
  // ========================================
  // STEP 4: Build transaction
  // ========================================
  console.log('\n📝 STEP 4: Building transaction...\n');
  
  const liquidityDelta = BigInt(Math.floor(Math.sqrt(Number(amount0) * Number(amount1))));
  console.log(`   Liquidity: ${liquidityDelta}`);
  
  const actions = (Actions.MINT_POSITION + Actions.SETTLE_PAIR.substring(2)) as Hex;
  const params: Hex[] = [];
  
  // MINT_POSITION params
  params.push(encodeAbiParameters(
    [
      { 
        name: 'poolKey', 
        type: 'tuple', 
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ]
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amount0Max', type: 'uint128' },
      { name: 'amount1Max', type: 'uint128' },
      { name: 'owner', type: 'address' },
      { name: 'hookData', type: 'bytes' },
    ],
    [
      {
        currency0: token0,
        currency1: token1,
        fee: CONFIG.FEE,
        tickSpacing: CONFIG.TICK_SPACING,
        hooks: CONFIG.HOOK,
      },
      CONFIG.TICK_LOWER,
      CONFIG.TICK_UPPER,
      liquidityDelta,
      amount0,
      amount1,
      account.address,
      '0x',
    ]
  ));
  
  // SETTLE_PAIR params
  params.push(encodeAbiParameters(
    [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
    ],
    [token0, token1]
  ));
  
  const unlockData = encodeAbiParameters(
    [
      { name: 'actions', type: 'bytes' },
      { name: 'params', type: 'bytes[]' },
    ],
    [actions, params]
  );
  
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  
  // ========================================
  // STEP 5: Execute
  // ========================================
  console.log('💧 STEP 5: Adding liquidity...\n');
  
  try {
    const hash = await walletClient.writeContract({
      address: CONFIG.POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: 'modifyLiquidities',
      args: [unlockData, deadline],
    });
    
    console.log(`📤 TX: ${hash}`);
    console.log(`🔗 https://sepolia.uniscan.xyz/tx/${hash}\n`);
    
    console.log('⏳ Confirming...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ SUCCESS!\n');
      
      try {
        const nextTokenId = await publicClient.readContract({
          address: CONFIG.POSITION_MANAGER,
          abi: POSITION_MANAGER_ABI,
          functionName: 'nextTokenId',
        }) as bigint;
        console.log(`🎫 NFT ID: ${nextTokenId - 1n}\n`);
      } catch {}
      
      console.log('═══════════════════════════════════════════════════');
      console.log('🎉 Pool has liquidity! Ready for swaps.');
      console.log('═══════════════════════════════════════════════════\n');
    }
  } catch (error: any) {
    console.error('❌ Failed:', error.shortMessage || error.message);
    if (error.message?.includes('PoolNotInitialized')) {
      console.log('\n💡 Wait and retry');
    }
    throw error;
  }
}

addLiquidity().catch((error) => {
  console.error('\n❌', error.message || error);
  process.exit(1);
});