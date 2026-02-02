import { UNICHAIN_SEPOLIA_CONFIG, POOL_CONFIG } from '../config/networks';
import { createPoolKey } from './poolKey';
import { checkPoolExists, createClients } from './poolManager';

async function main() {
  console.log('Pool Manager Test');
  console.log('===================\n');
  
  // Create PoolKey for USDC/WETH
  const poolKey = createPoolKey(
    UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
    UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
    POOL_CONFIG.fee,
    POOL_CONFIG.tickSpacing,
    POOL_CONFIG.hooks
  );
  
  console.log('Checking pool existence...');
  
  // Create public client (read-only, no private key needed)
  const { publicClient } = createClients();
  
  const exists = await checkPoolExists(poolKey, publicClient);
  
  if (exists) {
    console.log('Pool EXISTS!');
  } else {
    console.log('Pool does NOT exist');
    console.log('You will need to initialize it before swapping');
  }
}

main().catch(console.error);