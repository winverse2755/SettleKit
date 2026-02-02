import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  parseAbi,
  Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { UNICHAIN_SEPOLIA_CONFIG, POOL_CONFIG, unichainSepolia } from '../config/networks';
import { PoolKey, computePoolId } from './poolKey';
// Minimal PoolManager ABI (just what we need)
const POOL_MANAGER_ABI = parseAbi([
  'function getSlot0(bytes32 id) external view returns (uint160, int24, uint24, uint24)',
  'function initialize((address, address, uint24, int24, address) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)',
  'function swap((address, address, uint24, int24, address) key, (bool, int256, uint160) params, bytes hookData) external returns (int256, int256)',
]);

/**
 * Check if a pool exists in the PoolManager
 */
export async function checkPoolExists(
  poolKey: PoolKey,
  publicClient: PublicClient
): Promise<boolean> {
  try {
    const poolId = computePoolId(poolKey) as `0x${string}`;
    
    // Get slot0 - if sqrtPriceX96 is 0, pool doesn't exist
    const slot0 = await publicClient.readContract({
      address: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    }) as readonly [bigint, number, number, number];
    
    const sqrtPriceX96 = slot0[0];
    return sqrtPriceX96 > 0n;
  } catch (error) {
    console.error('Error checking pool existence:', error);
    return false;
  }
}

/**
 * Initialize a new pool in the PoolManager
 * sqrtPriceX96 = sqrt(price) * 2^96
 * For 1:1 price, use: 79228162514264337593543950336n
 */
export async function initializePool(
  poolKey: PoolKey,
  sqrtPriceX96: bigint,
  walletClient: any, // Using 'any' to bypass type issues
  account: Address
): Promise<string> {
  try {
    const { request } = await walletClient.simulateContract({
      address: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'initialize',
      args: [
        poolKey,
        sqrtPriceX96,
        '0x' as `0x${string}`, // empty hookData
      ],
      account,
    });
    
    const hash = await walletClient.writeContract(request);
    console.log('Pool initialized! Tx:', hash);
    return hash;
  } catch (error) {
    console.error('Error initializing pool:', error);
    throw error;
  }
}

/**
 * Get pool state (price, tick, fees)
 */
export async function getPoolState(
  poolKey: PoolKey,
  publicClient: PublicClient
): Promise<{
  sqrtPriceX96: bigint;
  tick: number;
  protocolFee: number;
  lpFee: number;
}> {
  const poolId = computePoolId(poolKey) as `0x${string}`;
  
  const slot0 = await publicClient.readContract({
    address: UNICHAIN_SEPOLIA_CONFIG.contracts.poolManager,
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
}

/**
 * Helper to create clients for Unichain Sepolia
 */
export function createClients(privateKey?: `0x${string}`) {
  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
  });
  
  if (!privateKey) {
    return { publicClient, walletClient: null, account: null };
  }
  
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http(),
  });
  
  return { publicClient, walletClient, account: account.address };
}