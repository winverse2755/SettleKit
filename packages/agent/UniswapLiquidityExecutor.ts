// Wrapper for Uniswap v4 liquidity provision via PositionManager

import {
    createPublicClient,
    createWalletClient,
    http,
    type Address,
    type PublicClient,
    type WalletClient,
    type Account,
    type Chain,
    encodeFunctionData,
    parseUnits,
    maxUint256,
} from 'viem';
import { unichainSepolia, CHAINS, type ChainKey } from '../sdk/src/config/networks';
import { getPoolState, type PoolState } from '../sdk/src/utils/pool-utils';
import type { DepositLiquidityIntent } from '../sdk/src/types/agent';

// Uniswap v4 PositionManager ABI (relevant functions for liquidity management)
const POSITION_MANAGER_ABI = [
    {
        name: 'modifyLiquidities',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'unlockData', type: 'bytes' },
            { name: 'deadline', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bytes' }],
    },
    {
        name: 'mint',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                name: 'params',
                type: 'tuple',
                components: [
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
                    { name: 'amount0Max', type: 'uint256' },
                    { name: 'amount1Max', type: 'uint256' },
                    { name: 'owner', type: 'address' },
                    { name: 'hookData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'liquidity', type: 'uint128' },
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
    },
    {
        name: 'increaseLiquidity',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'liquidity', type: 'uint256' },
            { name: 'amount0Max', type: 'uint256' },
            { name: 'amount1Max', type: 'uint256' },
            { name: 'hookData', type: 'bytes' },
        ],
        outputs: [
            { name: 'liquidity', type: 'uint128' },
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
    },
    {
        name: 'decreaseLiquidity',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'liquidity', type: 'uint256' },
            { name: 'amount0Min', type: 'uint256' },
            { name: 'amount1Min', type: 'uint256' },
            { name: 'hookData', type: 'bytes' },
        ],
        outputs: [
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
    },
    {
        name: 'collect',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'recipient', type: 'address' },
        ],
        outputs: [
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
    },
] as const;

// ERC20 ABI for token approvals
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
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// Contract addresses per chain
const CONTRACT_ADDRESSES: Partial<Record<ChainKey, {
    positionManager: Address;
    usdc: Address;
    poolManager: Address;
}>> = {
    unichainSepolia: {
        positionManager: '0xf969aee60879c54baaed9f3ed26147db216fd664', // Unichain Sepolia Position Manager
        usdc: '0x31d0220469e10c4E71834a79b1f276d740d3768F', // USDC on Unichain Sepolia
        poolManager: '0x00b036b58a818b1bc34d502d3fe730db729e62ac', // Pool Manager
    },
};

/**
 * Parameters for depositing liquidity
 */
export interface LiquidityDepositParams {
    /** Uniswap v4 pool ID (bytes32) */
    poolId: string;
    /** Amount to deposit (USDC with 6 decimals) */
    amount: string;
    /** Lower tick bound for concentrated liquidity */
    tickLower: number;
    /** Upper tick bound for concentrated liquidity */
    tickUpper: number;
    /** Recipient address for the position NFT */
    recipient?: Address;
    /** Pool key components (required for mint) */
    poolKey?: {
        currency0: Address;
        currency1: Address;
        fee: number;
        tickSpacing: number;
        hooks: Address;
    };
}

/**
 * Result of a liquidity deposit operation
 */
export interface LiquidityDepositResult {
    /** Whether the deposit was successful */
    success: boolean;
    /** Transaction hash of the deposit */
    txHash?: string;
    /** Position NFT token ID */
    positionId?: string;
    /** Actual liquidity amount minted */
    liquidityMinted?: string;
    /** Amount of token0 deposited */
    amount0?: string;
    /** Amount of token1 deposited */
    amount1?: string;
    /** Error message if failed */
    error?: string;
}

/**
 * UniswapLiquidityExecutor - Wrapper for Uniswap v4 liquidity provision
 * 
 * Handles:
 * - Token approvals for USDC
 * - Liquidity position minting via PositionManager
 * - Tick range management for concentrated liquidity
 * - Transaction execution and receipt handling
 */
export class UniswapLiquidityExecutor {
    private publicClient: PublicClient;
    private walletClient: WalletClient | null = null;
    private chainKey: ChainKey;
    private account: Account | null = null;

    constructor(
        account?: Account,
        chainKey: ChainKey = 'unichainSepolia'
    ) {
        this.chainKey = chainKey;
        this.account = account || null;

        const chain = CHAINS[chainKey];

        this.publicClient = createPublicClient({
            chain,
            transport: http(),
        });

        if (account) {
            this.walletClient = createWalletClient({
                account,
                chain,
                transport: http(),
            });
        }
    }

    /**
     * Get contract addresses for the current chain
     */
    private getAddresses(): { positionManager: Address; usdc: Address; poolManager: Address } {
        const addresses = CONTRACT_ADDRESSES[this.chainKey];
        if (!addresses) {
            throw new Error(`Contract addresses not configured for chain: ${this.chainKey}`);
        }
        return addresses;
    }

    /**
     * Check if executor has a valid wallet for transactions
     */
    public hasWallet(): boolean {
        return this.walletClient !== null && this.account !== null;
    }

    /**
     * Get the account address
     */
    public getAccountAddress(): Address | null {
        return this.account?.address || null;
    }

    /**
     * Check USDC balance for the account
     */
    async getUsdcBalance(address?: Address): Promise<bigint> {
        const { usdc } = this.getAddresses();
        const targetAddress = address || this.account?.address;

        if (!targetAddress) {
            throw new Error('No address provided and no account configured');
        }

        const balance = await this.publicClient.readContract({
            address: usdc,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [targetAddress],
        });

        return balance;
    }

    /**
     * Check current USDC allowance for the PositionManager
     */
    async getUsdcAllowance(owner?: Address): Promise<bigint> {
        const { usdc, positionManager } = this.getAddresses();
        const targetOwner = owner || this.account?.address;

        if (!targetOwner) {
            throw new Error('No owner provided and no account configured');
        }

        const allowance = await this.publicClient.readContract({
            address: usdc,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [targetOwner, positionManager],
        });

        return allowance;
    }

    /**
     * Approve USDC spending for the PositionManager
     * 
     * @param amount - Amount to approve (use maxUint256 for unlimited)
     * @returns Transaction hash of the approval
     */
    async approveUsdc(amount: bigint = maxUint256): Promise<string> {
        if (!this.walletClient || !this.account) {
            throw new Error('Wallet not configured. Initialize with an account to execute transactions.');
        }

        const { usdc, positionManager } = this.getAddresses();

        const txHash = await this.walletClient.writeContract({
            address: usdc,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [positionManager, amount],
            chain: CHAINS[this.chainKey],
            account: this.account,
        });

        // Wait for transaction confirmation
        await this.publicClient.waitForTransactionReceipt({ hash: txHash });

        return txHash;
    }

    /**
     * Ensure sufficient USDC allowance for the PositionManager
     * Approves if current allowance is insufficient
     * 
     * @param requiredAmount - Required amount for the operation
     * @returns Approval transaction hash if approval was needed, undefined otherwise
     */
    async ensureAllowance(requiredAmount: bigint): Promise<string | undefined> {
        const currentAllowance = await this.getUsdcAllowance();

        if (currentAllowance < requiredAmount) {
            // Approve max to avoid repeated approvals
            return await this.approveUsdc(maxUint256);
        }

        return undefined;
    }

    /**
     * Deposit liquidity to a Uniswap v4 pool
     * 
     * This method:
     * 1. Validates the deposit parameters
     * 2. Ensures sufficient USDC allowance
     * 3. Mints a new liquidity position via PositionManager
     * 4. Returns the transaction hash and position ID
     * 
     * @param params - Liquidity deposit parameters
     * @returns Result of the deposit operation
     */
    async deposit(params: LiquidityDepositParams): Promise<LiquidityDepositResult> {
        try {
            if (!this.walletClient || !this.account) {
                throw new Error('Wallet not configured. Initialize with an account to execute transactions.');
            }

            const { positionManager } = this.getAddresses();
            const recipient = params.recipient || this.account.address;

            // Parse amount (USDC has 6 decimals)
            const amountBigInt = BigInt(params.amount);

            // Ensure sufficient balance
            const balance = await this.getUsdcBalance();
            if (balance < amountBigInt) {
                return {
                    success: false,
                    error: `Insufficient USDC balance. Required: ${params.amount}, Available: ${balance.toString()}`,
                };
            }

            // Ensure sufficient allowance
            await this.ensureAllowance(amountBigInt);

            // Validate tick range
            if (params.tickLower >= params.tickUpper) {
                return {
                    success: false,
                    error: `Invalid tick range: tickLower (${params.tickLower}) must be less than tickUpper (${params.tickUpper})`,
                };
            }

            // Build mint parameters
            // Note: In a full implementation, poolKey would be fetched from the pool registry
            // For now, we use placeholder values or require them in params
            if (!params.poolKey) {
                return {
                    success: false,
                    error: 'poolKey is required for minting a new position',
                };
            }

            const mintParams = {
                poolKey: {
                    currency0: params.poolKey.currency0,
                    currency1: params.poolKey.currency1,
                    fee: params.poolKey.fee,
                    tickSpacing: params.poolKey.tickSpacing,
                    hooks: params.poolKey.hooks,
                },
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                liquidity: amountBigInt, // Simplified: using amount as liquidity
                amount0Max: amountBigInt,
                amount1Max: amountBigInt,
                owner: recipient,
                hookData: '0x' as `0x${string}`,
            };

            // Execute the mint transaction
            const txHash = await this.walletClient.writeContract({
                address: positionManager,
                abi: POSITION_MANAGER_ABI,
                functionName: 'mint',
                args: [mintParams],
                chain: CHAINS[this.chainKey],
                account: this.account,
            });

            // Wait for transaction confirmation
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

            // Parse position ID from logs (simplified - in production, decode specific event)
            // The actual position ID would be in the Transfer event of the position NFT
            const positionId = this.extractPositionIdFromReceipt(receipt);

            return {
                success: receipt.status === 'success',
                txHash,
                positionId,
                error: receipt.status !== 'success' ? 'Transaction reverted' : undefined,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Deposit liquidity using a DepositLiquidityIntent
     * Convenience method that converts intent to deposit params
     * 
     * @param intent - The deposit liquidity intent
     * @param poolKey - Pool key components (required)
     * @returns Result of the deposit operation
     */
    async depositFromIntent(
        intent: DepositLiquidityIntent,
        poolKey: LiquidityDepositParams['poolKey']
    ): Promise<LiquidityDepositResult> {
        // Default tick range if not specified (full range)
        const tickLower = intent.tickLower ?? -887220;
        const tickUpper = intent.tickUpper ?? 887220;

        return this.deposit({
            poolId: intent.poolId,
            amount: intent.amount,
            tickLower,
            tickUpper,
            recipient: intent.recipient as Address | undefined,
            poolKey,
        });
    }

    /**
     * Extract position ID from transaction receipt
     * In production, this would decode the specific mint event
     */
    private extractPositionIdFromReceipt(receipt: { logs: readonly { topics: readonly string[]; data: string }[] }): string | undefined {
        // Look for Transfer event from position NFT (ERC721)
        // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        // Topic[0] = keccak256("Transfer(address,address,uint256)")
        const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

        for (const log of receipt.logs) {
            if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 4) {
                // tokenId is in topics[3] for indexed ERC721 Transfer
                const tokenIdHex = log.topics[3];
                if (tokenIdHex) {
                    return BigInt(tokenIdHex).toString();
                }
            }
        }

        return undefined;
    }

    /**
     * Get pool state for a given pool ID
     * Delegates to pool-utils for actual fetching
     * 
     * @param poolId - The pool ID (bytes32)
     * @returns Pool state
     */
    async getPoolState(poolId: `0x${string}`): Promise<PoolState> {
        return getPoolState(poolId, this.chainKey);
    }

    /**
     * Calculate optimal tick range based on current pool state
     * Returns a centered range around the current tick
     * 
     * @param poolId - The pool ID
     * @param rangeWidth - Desired range width in ticks (default: 1000)
     * @returns Tick range { tickLower, tickUpper }
     */
    async calculateOptimalTickRange(
        poolId: `0x${string}`,
        rangeWidth: number = 1000
    ): Promise<{ tickLower: number; tickUpper: number }> {
        const state = await this.getPoolState(poolId);

        // Center the range around the current tick
        const halfRange = Math.floor(rangeWidth / 2);
        const tickLower = state.tick - halfRange;
        const tickUpper = state.tick + halfRange;

        // Ensure ticks are within valid bounds
        const MIN_TICK = -887272;
        const MAX_TICK = 887272;

        return {
            tickLower: Math.max(tickLower, MIN_TICK),
            tickUpper: Math.min(tickUpper, MAX_TICK),
        };
    }

    /**
     * Simulate a deposit to estimate the output
     * 
     * @param params - Deposit parameters
     * @returns Estimated amounts that would be deposited
     */
    async simulateDeposit(params: LiquidityDepositParams): Promise<{
        estimatedAmount0: string;
        estimatedAmount1: string;
        estimatedLiquidity: string;
    }> {
        // Fetch current pool state
        const poolState = await this.getPoolState(params.poolId as `0x${string}`);

        // Calculate liquidity based on amount and tick range
        // This is a simplified calculation - actual implementation would use
        // the Uniswap v4 liquidity math library
        const amount = BigInt(params.amount);
        const tickRange = params.tickUpper - params.tickLower;

        // Simplified estimation: liquidity proportional to amount and inversely to range
        // In production, use proper sqrtPriceX96-based calculations
        const estimatedLiquidity = amount * BigInt(tickRange) / 1000n;

        return {
            estimatedAmount0: amount.toString(),
            estimatedAmount1: amount.toString(),
            estimatedLiquidity: estimatedLiquidity.toString(),
        };
    }
}

/**
 * Create a UniswapLiquidityExecutor with a private key
 * Convenience factory function
 * 
 * @param privateKey - Private key for signing transactions
 * @param chainKey - Chain to operate on
 * @returns Configured executor instance
 */
export function createLiquidityExecutor(
    privateKey: `0x${string}`,
    chainKey: ChainKey = 'unichainSepolia'
): UniswapLiquidityExecutor {
    const { privateKeyToAccount } = require('viem/accounts');
    const account = privateKeyToAccount(privateKey);
    return new UniswapLiquidityExecutor(account, chainKey);
}
