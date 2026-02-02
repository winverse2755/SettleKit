import { Hash, Address, parseUnits, formatUnits } from 'viem';
import { Leg, LegEstimate, LegReceipt, RollbackStrategy } from '../types';
import { UNICHAIN_SEPOLIA_CONFIG, POOL_CONFIG } from '../config/networks';
import { createPoolKey, getSwapDirection } from '../utils/poolKey';

// Simplified Swap ABI
const POOL_MANAGER_ABI = [
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [
      { name: 'delta0', type: 'int256' },
      { name: 'delta1', type: 'int256' },
    ],
  },
] as const;

// ERC20 ABI for approvals
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface UniswapV4SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string; // Human-readable amount (e.g., "1.0")
  decimalsIn: number;
  maxSlippage?: number; // Percentage (e.g., 1 = 1%)
}

export class UniswapV4SwapLeg extends Leg {
  private params: UniswapV4SwapParams;

  constructor(params: UniswapV4SwapParams) {
    super(`uniswap-v4-swap-${params.tokenIn}-${params.tokenOut}`, 'UniswapV4Swap');
    this.params = params;
  }

  async estimate(): Promise<LegEstimate> {
    // For testnet demo, return estimated values
    // In production, you'd query the Quoter contract
    return {
      estimatedTime: 30, // ~2 blocks on Unichain
      gasEstimate: BigInt(200000),
      confidence: 0.95,
      expectedOutput: this.params.amountIn, // 1:1 price assumption
      priceImpact: 0.001, // 0.1% estimate
    };
  }

  async execute(signer: any): Promise<LegReceipt> {
    console.log('\n🔄 Executing Uniswap v4 Swap...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Create pool key
    const poolKey = createPoolKey(
      UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
      UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
      POOL_CONFIG.fee,
      POOL_CONFIG.tickSpacing,
      POOL_CONFIG.hooks
    );

    console.log('📋 Pool Key:');
    console.log('   Currency0:', poolKey.currency0);
    console.log('   Currency1:', poolKey.currency1);
    console.log('   Fee:', POOL_CONFIG.fee, '(0.3%)');

    // Determine swap direction
    const zeroForOne = getSwapDirection(poolKey, this.params.tokenIn);
    console.log('\n🔀 Swap Direction:', zeroForOne ? 'USDC → WETH' : 'WETH → USDC');

    // Parse amount
    const amountSpecified = parseUnits(this.params.amountIn, this.params.decimalsIn);
    console.log('💰 Amount In:', this.params.amountIn, zeroForOne ? 'USDC' : 'WETH');

    // Price limit (for slippage protection)
    // For 1:1 price, use sqrt(1) * 2^96
    // For max slippage, adjust accordingly
    const sqrtPriceLimitX96 = zeroForOne
      ? BigInt('4295128739') // Min price (max slippage down)
      : BigInt('1461446703485210103287273052203988822378723970342'); // Max price (max slippage up)

    // Step 1: Approve PoolManager to spend tokenIn
    console.log('\n✍️  Step 1: Approving PoolManager...');
    
    const allowance = await signer.readContract({
      address: this.params.tokenIn,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [signer.account.address, UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager],
    });

    if (allowance < amountSpecified) {
      const approveHash = await signer.writeContract({
        address: this.params.tokenIn,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager, amountSpecified],
      });

      console.log('   Approval Tx:', approveHash);
      await signer.waitForTransactionReceipt({ hash: approveHash });
      console.log('   ✅ Approved');
    } else {
      console.log('   ✅ Already approved');
    }

    // Step 2: Execute swap
    console.log('\n🔄 Step 2: Executing swap...');

    try {
      const swapHash = await signer.writeContract({
        address: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager,
        abi: POOL_MANAGER_ABI,
        functionName: 'swap',
        args: [
          poolKey,
          {
            zeroForOne,
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96,
          },
          '0x', // empty hookData
        ],
      });

      console.log('   ✅ Swap Tx:', swapHash);
      console.log('   🔗 Explorer:', `https://sepolia.uniscan.xyz/tx/${swapHash}`);

      console.log('\n⏳ Waiting for confirmation...');
      const receipt = await signer.waitForTransactionReceipt({ hash: swapHash });

      if (receipt.status === 'success') {
        console.log('✅ Swap successful!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
          legId: this.id,
          txHash: swapHash,
          status: 'completed',
          amountOut: 'Check explorer for details',
        };
      } else {
        throw new Error('Swap transaction failed');
      }
    } catch (error: any) {
      console.error('❌ Swap failed:', error.message);
      throw error;
    }
  }

  async verify(txHash: Hash): Promise<boolean> {
    // In production, verify the swap succeeded by checking logs
    return true;
  }

  getRollbackStrategy(): RollbackStrategy | null {
    // Swaps can be reversed with another swap
    return {
      canRollback: true,
      rollbackSteps: ['Execute reverse swap'],
      estimatedCost: BigInt(200000),
    };
  }
}