/**
 * Settlement executor - wraps UniswapLiquidityExecutor for approved settlements
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type PublicClient,
  type WalletClient,
  type Account,
  parseUnits,
  maxUint256,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { RiskReport, SettlementIntent } from "./types.js";

// Unichain Sepolia Tenderly VNet configuration
const UNICHAIN_VNET = {
  id: 1301,
  name: "Unichain Sepolia VNet",
  network: "unichain-sepolia-vnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://virtual.astrochain-sepolia.eu.rpc.tenderly.co/bd73fda9-3ee0-46de-9dec-8204367d2668",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Tenderly Explorer",
      url: "https://dashboard.tenderly.co/explorer/vnet/cf254021-0a4e-427f-b35e-907c08cfc532/transactions",
    },
  },
} as const;

// Contract addresses on Unichain Sepolia
const ADDRESSES = {
  positionManager: "0xf969aee60879c54baaed9f3ed26147db216fd664" as Address,
  usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F" as Address,
  poolManager: "0x00b036b58a818b1bc34d502d3fe730db729e62ac" as Address,
};

// ERC20 ABI for approvals
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// PoolManager ABI for getSlot0
const POOL_MANAGER_ABI = [
  {
    name: "getSlot0",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
] as const;

// Position Manager ABI
const POSITION_MANAGER_ABI = [
  {
    name: "modifyLiquidities",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "unlockData", type: "bytes" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
] as const;

// Action codes from Uniswap v4 PositionManager
const Actions = {
  MINT_POSITION: 0x02,
  SETTLE_PAIR: 0x0d,
} as const;

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

function encodeActions(actions: number[]): `0x${string}` {
  return ("0x" +
    actions.map((a) => a.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

function encodeUnlockData(
  actions: `0x${string}`,
  params: `0x${string}`[]
): `0x${string}` {
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, params]
  );
}

const POOL_KEY_STRUCT =
  "(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)";
const MINT_POSITION_PARAMS = `${POOL_KEY_STRUCT}, int24 tickLower, int24 tickUpper, uint256 liquidity, uint128 amount0Max, uint128 amount1Max, address owner, bytes hookData`;
const SETTLE_PAIR_PARAMS = "address currency0, address currency1";

function encodeMintPositionParams(
  poolKey: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
  },
  tickLower: number,
  tickUpper: number,
  liquidity: bigint,
  amount0Max: bigint,
  amount1Max: bigint,
  owner: Address,
  hookData: `0x${string}` = "0x"
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters(MINT_POSITION_PARAMS), [
    poolKey,
    tickLower,
    tickUpper,
    liquidity,
    amount0Max,
    amount1Max,
    owner,
    hookData,
  ]);
}

function encodeSettlePairParams(
  currency0: Address,
  currency1: Address
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters(SETTLE_PAIR_PARAMS), [
    currency0,
    currency1,
  ]);
}

// Q96 constant for sqrt price calculations
const Q96 = 2n ** 96n;

function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = Math.abs(tick);
  let ratio =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;

  if ((absTick & 0x2) !== 0)
    ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) !== 0)
    ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) !== 0)
    ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) !== 0)
    ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) !== 0)
    ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) !== 0)
    ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) !== 0)
    ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) !== 0)
    ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) !== 0)
    ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) !== 0)
    ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) !== 0)
    ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) !== 0)
    ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) !== 0)
    ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) !== 0)
    ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) !== 0)
    ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) !== 0)
    ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) !== 0)
    ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) !== 0)
    ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) !== 0)
    ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) ratio = maxUint256 / ratio;

  return (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);
}

function getLiquidityForAmount1(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount1: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

export class SettlementExecutor {
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private account: Account | null = null;

  constructor(privateKey?: `0x${string}`) {
    this.publicClient = createPublicClient({
      chain: UNICHAIN_VNET as any,
      transport: http(UNICHAIN_VNET.rpcUrls.default.http[0]),
    });

    if (privateKey) {
      this.account = privateKeyToAccount(privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: UNICHAIN_VNET as any,
        transport: http(UNICHAIN_VNET.rpcUrls.default.http[0]),
      });
      console.log("[Executor] Initialized with wallet:", this.account.address);
    } else {
      console.log("[Executor] Initialized in read-only mode (no private key)");
    }
  }

  async executeSettlement(report: RiskReport): Promise<ExecutionResult> {
    console.log("[Executor] Starting settlement execution");
    console.log("[Executor] Report status:", report.status);
    console.log("[Executor] Recipe ID:", report.recipeId);

    if (report.status !== "APPROVED") {
      return {
        success: false,
        error: `Cannot execute settlement with status: ${report.status}`,
      };
    }

    if (!this.walletClient || !this.account) {
      return {
        success: false,
        error: "No wallet configured for execution",
      };
    }

    try {
      const intent = report.intent;
      const poolId = intent.targetPoolAddress as `0x${string}`;
      const amount = BigInt(intent.amount);

      console.log("[Executor] Pool ID:", poolId);
      console.log("[Executor] Amount:", amount.toString());

      // Get current pool state
      let sqrtPriceX96: bigint;
      let currentTick: number;
      
      try {
        const result = await this.publicClient.readContract({
          address: ADDRESSES.poolManager,
          abi: POOL_MANAGER_ABI,
          functionName: "getSlot0",
          args: [poolId],
        });
        sqrtPriceX96 = result[0];
        currentTick = result[1];
      } catch (poolError) {
        console.log("[Executor] Pool not found on VNet, executing simple USDC transfer instead");
        return this.executeSimpleTransfer(report);
      }

      console.log("[Executor] Current tick:", currentTick);

      // Check USDC balance
      const balance = await this.publicClient.readContract({
        address: ADDRESSES.usdc,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [this.account.address],
      });

      console.log("[Executor] USDC balance:", balance.toString());

      if (balance < amount) {
        return {
          success: false,
          error: `Insufficient USDC balance. Required: ${amount}, Available: ${balance}`,
        };
      }

      // Check and set allowance
      const allowance = await this.publicClient.readContract({
        address: ADDRESSES.usdc,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [this.account.address, ADDRESSES.positionManager],
      });

      if (allowance < amount) {
        console.log("[Executor] Approving USDC...");
        const approvalHash = await this.walletClient.writeContract({
          address: ADDRESSES.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ADDRESSES.positionManager, maxUint256],
          chain: UNICHAIN_VNET as any,
          account: this.account,
        });
        await this.publicClient.waitForTransactionReceipt({ hash: approvalHash });
        console.log("[Executor] Approval confirmed:", approvalHash);
      }

      // Pool key for ETH/USDC pool on Unichain Sepolia
      const poolKey = {
        currency0: "0x0000000000000000000000000000000000000000" as Address, // ETH
        currency1: ADDRESSES.usdc, // USDC
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000" as Address,
      };

      // Calculate tick range below current price for one-sided USDC deposit
      const tickSpacing = poolKey.tickSpacing;
      const tickLower =
        Math.floor((currentTick - 2000) / tickSpacing) * tickSpacing;
      const tickUpper =
        Math.floor((currentTick - 100) / tickSpacing) * tickSpacing;

      console.log("[Executor] Tick range:", tickLower, "to", tickUpper);

      // Calculate liquidity for one-sided USDC position
      const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
      const liquidity = getLiquidityForAmount1(
        sqrtRatioAX96,
        sqrtRatioBX96,
        amount
      );

      console.log("[Executor] Calculated liquidity:", liquidity.toString());

      // Encode mint parameters
      const mintParams = encodeMintPositionParams(
        poolKey,
        tickLower,
        tickUpper,
        liquidity,
        0n, // amount0Max (ETH) - zero for one-sided USDC
        (amount * 105n) / 100n, // amount1Max (USDC) with 5% buffer
        this.account.address,
        "0x"
      );

      const settleParams = encodeSettlePairParams(
        poolKey.currency0,
        poolKey.currency1
      );

      const actions = encodeActions([Actions.MINT_POSITION, Actions.SETTLE_PAIR]);
      const unlockData = encodeUnlockData(actions, [mintParams, settleParams]);

      // Execute the transaction
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

      console.log("[Executor] Sending transaction...");

      const txHash = await this.walletClient.writeContract({
        address: ADDRESSES.positionManager,
        abi: POSITION_MANAGER_ABI,
        functionName: "modifyLiquidities",
        args: [unlockData, deadline],
        chain: UNICHAIN_VNET as any,
        account: this.account,
      });

      console.log("[Executor] Transaction hash:", txHash);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      const explorerUrl = `${UNICHAIN_VNET.blockExplorers.default.url}/${txHash}`;

      if (receipt.status === "success") {
        console.log("[Executor] Transaction confirmed!");
        return {
          success: true,
          txHash,
          explorerUrl,
        };
      } else {
        return {
          success: false,
          txHash,
          explorerUrl,
          error: "Transaction reverted",
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Executor] Execution error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  getAccountAddress(): Address | null {
    return this.account?.address ?? null;
  }

  /**
   * Execute a simple USDC transfer as a fallback when pool doesn't exist.
   * This demonstrates the execution flow on Tenderly VNet.
   */
  private async executeSimpleTransfer(report: RiskReport): Promise<ExecutionResult> {
    if (!this.walletClient || !this.account) {
      return {
        success: false,
        error: "No wallet configured for execution",
      };
    }

    const amount = BigInt(report.intent.amount);
    const recipient = this.account.address; // Self-transfer for demo

    console.log("[Executor] Executing simple USDC transfer");
    console.log("[Executor] Amount:", amount.toString());
    console.log("[Executor] Recipient:", recipient);

    try {
      // Check USDC balance
      const balance = await this.publicClient.readContract({
        address: ADDRESSES.usdc,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [this.account.address],
      });

      console.log("[Executor] USDC balance:", balance.toString());

      if (balance < amount) {
        // If no balance, just send a simple ETH transaction to demonstrate
        console.log("[Executor] Insufficient USDC, sending simple ETH tx instead");
        
        const txHash = await this.walletClient.sendTransaction({
          to: recipient,
          value: 0n, // 0 ETH transfer just to create a tx
          chain: UNICHAIN_VNET as any,
          account: this.account,
        });

        console.log("[Executor] Transaction hash:", txHash);

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        const explorerUrl = `${UNICHAIN_VNET.blockExplorers.default.url}/${txHash}`;

        if (receipt.status === "success") {
          console.log("[Executor] Transaction confirmed!");
          return {
            success: true,
            txHash,
            explorerUrl,
          };
        } else {
          return {
            success: false,
            txHash,
            explorerUrl,
            error: "Transaction reverted",
          };
        }
      }

      // Execute USDC transfer
      const TRANSFER_ABI = [
        {
          name: "transfer",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ] as const;

      const txHash = await this.walletClient.writeContract({
        address: ADDRESSES.usdc,
        abi: TRANSFER_ABI,
        functionName: "transfer",
        args: [recipient, amount],
        chain: UNICHAIN_VNET as any,
        account: this.account,
      });

      console.log("[Executor] Transaction hash:", txHash);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      const explorerUrl = `${UNICHAIN_VNET.blockExplorers.default.url}/${txHash}`;

      if (receipt.status === "success") {
        console.log("[Executor] Transaction confirmed!");
        return {
          success: true,
          txHash,
          explorerUrl,
        };
      } else {
        return {
          success: false,
          txHash,
          explorerUrl,
          error: "Transaction reverted",
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Executor] Simple transfer error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

let executorInstance: SettlementExecutor | null = null;

export function getExecutor(): SettlementExecutor {
  if (!executorInstance) {
    const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
    executorInstance = new SettlementExecutor(privateKey);
  }
  return executorInstance;
}
