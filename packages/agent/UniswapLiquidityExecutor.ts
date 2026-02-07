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
    encodeAbiParameters,
    parseAbiParameters,
} from 'viem';
import { unichainSepolia, CHAINS, type ChainKey } from '../sdk/src/config/networks';
import { getPoolState, type PoolState } from '../sdk/src/utils/pool-utils';
import type { DepositLiquidityIntent } from '../sdk/src/types/agent';
import {
    getSqrtRatioAtTick,
    getLiquidityForAmount0,
    getLiquidityForAmount1,
    getLiquidityForAmounts,
    getAmountsForLiquidity,
} from '../sdk/src/utils/liquidity-math';

/**
 * Helper function to get amounts for liquidity (wrapper around getAmountsForLiquidity)
 * Returns the token amounts required for a given liquidity position
 */
function getAmountsForLiquidityHelper(
    sqrtRatioX96: bigint,
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): { amount0: bigint; amount1: bigint } {
    return getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
}

// Uniswap v4 PositionManager ABI (relevant functions for liquidity management)
// Note: mint() is an internal function - use modifyLiquidities() as the external entry point
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

// =============================================================================
// Uniswap v4 Action Constants and Encoding Helpers
// =============================================================================

/**
 * Action codes from Uniswap v4 PositionManager
 * These are used to build the encoded actions for modifyLiquidities()
 * @see https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
 */
const Actions = {
    /** Mint a new liquidity position */
    MINT_POSITION: 0x02,
    /** Settle a pair of currencies (provide tokens to pay for position) */
    SETTLE_PAIR: 0x0d,
    /** Sweep remaining tokens back to recipient */
    SWEEP: 0x14,
} as const;

/**
 * ABI parameter types for encoding action parameters
 */
const POOL_KEY_STRUCT = '(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)';
const MINT_POSITION_PARAMS = `${POOL_KEY_STRUCT}, int24 tickLower, int24 tickUpper, uint256 liquidity, uint128 amount0Max, uint128 amount1Max, address owner, bytes hookData`;
const SETTLE_PAIR_PARAMS = 'address currency0, address currency1';
const SWEEP_PARAMS = 'address currency, address recipient';

/**
 * Encode action IDs into a packed bytes sequence
 * Each action ID is encoded as a single byte
 * 
 * @param actions - Array of action IDs (e.g., [Actions.MINT_POSITION, Actions.SETTLE_PAIR])
 * @returns Packed bytes representation of actions
 * 
 * @example
 * encodeActions([Actions.MINT_POSITION, Actions.SETTLE_PAIR])
 * // Returns '0x020d'
 */
function encodeActions(actions: number[]): `0x${string}` {
    return ('0x' + actions.map(a => a.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

/**
 * Encode the unlockData parameter for modifyLiquidities()
 * Combines encoded actions with their corresponding parameters
 * 
 * @param actions - Packed bytes of action IDs from encodeActions()
 * @param params - Array of ABI-encoded parameters for each action
 * @returns Encoded unlockData ready for modifyLiquidities()
 * 
 * @example
 * const actions = encodeActions([Actions.MINT_POSITION, Actions.SETTLE_PAIR]);
 * const unlockData = encodeUnlockData(actions, [mintParams, settleParams]);
 * // Use unlockData in modifyLiquidities(unlockData, deadline)
 */
function encodeUnlockData(actions: `0x${string}`, params: `0x${string}`[]): `0x${string}` {
    return encodeAbiParameters(
        [{ type: 'bytes' }, { type: 'bytes[]' }],
        [actions, params]
    );
}

/**
 * Encode parameters for MINT_POSITION action
 * 
 * @param poolKey - The pool key struct
 * @param tickLower - Lower tick bound
 * @param tickUpper - Upper tick bound
 * @param liquidity - Amount of liquidity to mint
 * @param amount0Max - Maximum amount of token0 to spend
 * @param amount1Max - Maximum amount of token1 to spend
 * @param owner - Address to receive the position NFT
 * @param hookData - Optional hook data (default: '0x')
 * @returns ABI-encoded parameters for MINT_POSITION action
 */
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
    hookData: `0x${string}` = '0x'
): `0x${string}` {
    return encodeAbiParameters(
        parseAbiParameters(MINT_POSITION_PARAMS),
        [
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            owner,
            hookData,
        ]
    );
}

/**
 * Encode parameters for SETTLE_PAIR action
 * 
 * @param currency0 - Address of the first currency (token0)
 * @param currency1 - Address of the second currency (token1)
 * @returns ABI-encoded parameters for SETTLE_PAIR action
 */
function encodeSettlePairParams(currency0: Address, currency1: Address): `0x${string}` {
    return encodeAbiParameters(
        parseAbiParameters(SETTLE_PAIR_PARAMS),
        [currency0, currency1]
    );
}

/**
 * Encode parameters for SWEEP action
 * Used to recover unused tokens (especially for native ETH pools)
 * 
 * @param currency - Address of the currency to sweep
 * @param recipient - Address to receive the swept tokens
 * @returns ABI-encoded parameters for SWEEP action
 */
function encodeSweepParams(currency: Address, recipient: Address): `0x${string}` {
    return encodeAbiParameters(
        parseAbiParameters(SWEEP_PARAMS),
        [currency, recipient]
    );
}

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
 * Default deadline offset in seconds (20 minutes)
 */
const DEFAULT_DEADLINE_SECONDS = 20 * 60;

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
    /** Transaction deadline as Unix timestamp (seconds). Defaults to 20 minutes from now. */
    deadline?: bigint;
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
     * This method uses the Uniswap v4 command-based architecture:
     * 1. Validates the deposit parameters
     * 2. Ensures sufficient USDC allowance
     * 3. Encodes MINT_POSITION and SETTLE_PAIR actions
     * 4. Calls modifyLiquidities() with the encoded unlockData
     * 5. Returns the transaction hash and position ID
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

            // Calculate deadline: use provided deadline or default to 20 minutes from now
            const deadline = params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);

            // Get current pool state to determine position type
            const poolState = await this.getPoolState(params.poolId as `0x${string}`);
            const currentSqrtPriceX96 = poolState.sqrtPriceX96;

            // Calculate sqrt price ratios for tick boundaries
            const sqrtRatioAX96 = getSqrtRatioAtTick(params.tickLower);
            const sqrtRatioBX96 = getSqrtRatioAtTick(params.tickUpper);

            // Determine liquidity based on position type relative to current price
            // For ETH/USDC pool: token0 = ETH, token1 = USDC
            let liquidity: bigint;
            let amount0Max: bigint;
            let amount1Max: bigint;

            if (currentSqrtPriceX96 <= sqrtRatioAX96) {
                // Current price is below the range - only token0 (ETH) is needed
                // This means we're providing liquidity above the current price
                liquidity = getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amountBigInt);
                // Add 5% buffer for slippage/rounding
                amount0Max = (amountBigInt * 105n) / 100n;
                amount1Max = 0n;
            } else if (currentSqrtPriceX96 >= sqrtRatioBX96) {
                // Current price is above the range - only token1 (USDC) is needed
                // This is a one-sided USDC deposit (range is below current price)
                liquidity = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amountBigInt);
                amount0Max = 0n;
                // Add 5% buffer for slippage/rounding
                amount1Max = (amountBigInt * 105n) / 100n;
            } else {
                // Current price is within the range - both tokens needed
                // NOTE: For one-sided USDC deposits, the tick range should be set BELOW
                // the current price so this branch is not reached. If you reach here with
                // only USDC available, the deposit will fail.
                liquidity = getLiquidityForAmounts(
                    currentSqrtPriceX96,
                    sqrtRatioAX96,
                    sqrtRatioBX96,
                    amountBigInt, // amount0 (ETH)
                    amountBigInt  // amount1 (USDC)
                );
                // Calculate actual max amounts needed for this liquidity
                const amounts = getAmountsForLiquidityHelper(
                    currentSqrtPriceX96,
                    sqrtRatioAX96,
                    sqrtRatioBX96,
                    liquidity
                );
                // Add 5% buffer for slippage
                amount0Max = (amounts.amount0 * 105n) / 100n;
                amount1Max = (amounts.amount1 * 105n) / 100n;
            }

            // Debug logging: Verify liquidity calculation
            const positionType = currentSqrtPriceX96 <= sqrtRatioAX96
                ? 'above-range (token0 only)'
                : currentSqrtPriceX96 >= sqrtRatioBX96
                    ? 'below-range (token1 only)'
                    : 'in-range (both tokens)';

            console.log(`[Executor] ========== Liquidity Calculation Debug ==========`);
            console.log(`[Executor] Input amount: ${amountBigInt} (raw units)`);
            console.log(`[Executor] Tick range: ${params.tickLower} to ${params.tickUpper}`);
            console.log(`[Executor] Current pool tick: ${poolState.tick}`);
            console.log(`[Executor] Position type: ${positionType}`);
            console.log(`[Executor] sqrtRatioAX96 (lower): ${sqrtRatioAX96}`);
            console.log(`[Executor] sqrtRatioBX96 (upper): ${sqrtRatioBX96}`);
            console.log(`[Executor] currentSqrtPriceX96: ${currentSqrtPriceX96}`);
            console.log(`[Executor] Calculated liquidity: ${liquidity}`);
            console.log(`[Executor] amount0Max (token0): ${amount0Max}`);
            console.log(`[Executor] amount1Max (token1): ${amount1Max}`);

            // Reverse calculation to verify expected deposit amounts
            const expectedAmounts = getAmountsForLiquidityHelper(
                currentSqrtPriceX96,
                sqrtRatioAX96,
                sqrtRatioBX96,
                liquidity
            );
            console.log(`[Executor] Expected amount0 deposit: ${expectedAmounts.amount0}`);
            console.log(`[Executor] Expected amount1 deposit: ${expectedAmounts.amount1}`);
            console.log(`[Executor] ====================================================`);

            // Encode MINT_POSITION action parameters with calculated liquidity
            const mintParams = encodeMintPositionParams(
                params.poolKey,
                params.tickLower,
                params.tickUpper,
                liquidity,    // Properly calculated liquidity value
                amount0Max,   // Maximum token0 to spend
                amount1Max,   // Maximum token1 to spend
                recipient,
                '0x' // hookData
            );

            // Encode SETTLE_PAIR action parameters
            const settleParams = encodeSettlePairParams(
                params.poolKey.currency0,
                params.poolKey.currency1
            );

            // Encode actions: MINT_POSITION followed by SETTLE_PAIR
            const actions = encodeActions([Actions.MINT_POSITION, Actions.SETTLE_PAIR]);

            // Combine actions and parameters into unlockData
            const unlockData = encodeUnlockData(actions, [mintParams, settleParams]);

            // Execute the modifyLiquidities transaction
            const txHash = await this.walletClient.writeContract({
                address: positionManager,
                abi: POSITION_MANAGER_ABI,
                functionName: 'modifyLiquidities',
                args: [unlockData, deadline],
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
     * For one-sided USDC deposits, this method calculates an optimal tick range
     * that is BELOW the current price, ensuring only token1 (USDC) is required.
     * 
     * @param intent - The deposit liquidity intent
     * @param poolKey - Pool key components (required)
     * @param deadline - Optional transaction deadline as Unix timestamp (seconds)
     * @returns Result of the deposit operation
     */
    async depositFromIntent(
        intent: DepositLiquidityIntent,
        poolKey: LiquidityDepositParams['poolKey'],
        deadline?: bigint
    ): Promise<LiquidityDepositResult> {
        let tickLower: number;
        let tickUpper: number;

        if (intent.tickLower !== undefined && intent.tickUpper !== undefined) {
            // Use provided tick range
            tickLower = intent.tickLower;
            tickUpper = intent.tickUpper;
        } else {
            // Calculate one-sided USDC tick range (below current price)
            // This ensures only token1 (USDC) is required for the deposit
            if (!poolKey) {
                return {
                    success: false,
                    error: 'poolKey is required to calculate tick range for one-sided USDC deposit',
                };
            }

            try {
                // Fetch current pool state to get current tick
                const poolState = await this.getPoolState(intent.poolId as `0x${string}`);
                const currentTick = poolState.tick;
                const tickSpacing = poolKey.tickSpacing;

                // Create range BELOW current price (one-sided USDC)
                // Range: [currentTick - 2000, currentTick - 100], aligned to tickSpacing
                // This ensures currentSqrtPriceX96 >= sqrtRatioBX96, requiring only token1
                tickLower = Math.floor((currentTick - 2000) / tickSpacing) * tickSpacing;
                tickUpper = Math.floor((currentTick - 100) / tickSpacing) * tickSpacing;

                // Ensure tickLower < tickUpper
                if (tickLower >= tickUpper) {
                    tickLower = tickUpper - tickSpacing;
                }

                // Validate that the tick range is BELOW the current price
                // For one-sided USDC deposits, we need: currentSqrtPriceX96 >= sqrtRatioBX96
                const currentSqrtPriceX96 = poolState.sqrtPriceX96;
                const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

                if (currentSqrtPriceX96 < sqrtRatioBX96) {
                    return {
                        success: false,
                        error: `Tick range overlaps current price - not a valid one-sided USDC position. ` +
                            `Upper tick ${tickUpper} must be below current tick ${currentTick} for one-sided USDC deposit.`,
                    };
                }

                console.log(`[Executor] Calculated one-sided USDC tick range:`);
                console.log(`[Executor]   Current tick: ${currentTick}`);
                console.log(`[Executor]   tickSpacing: ${tickSpacing}`);
                console.log(`[Executor]   tickLower: ${tickLower}`);
                console.log(`[Executor]   tickUpper: ${tickUpper}`);
                console.log(`[Executor]   Validation passed: currentSqrtPriceX96 (${currentSqrtPriceX96}) >= sqrtRatioBX96 (${sqrtRatioBX96})`);
            } catch (error) {
                return {
                    success: false,
                    error: `Failed to calculate tick range: ${error instanceof Error ? error.message : 'Unknown error'}`,
                };
            }
        }

        return this.deposit({
            poolId: intent.poolId,
            amount: intent.amount,
            tickLower,
            tickUpper,
            recipient: intent.recipient as Address | undefined,
            poolKey,
            deadline,
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
