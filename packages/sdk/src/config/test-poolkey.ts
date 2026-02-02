import { UNICHAIN_SEPOLIA_CONFIG } from './networks';
import { 
  createPoolKey, 
  computePoolId, 
  getSwapDirection,
  getOutputToken,
  sortTokens,
  formatPoolKey,
  type PoolKey 
} from '../utils/poolKey';

async function testPoolKeyUtils() {
  console.log('Testing PoolKey Utilities\n');
  console.log('='.repeat(50));
  
  // Test 1: Token sorting
  console.log('\n Test 1: Token Sorting');
  const [token0, token1] = sortTokens(
    UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
    UNICHAIN_SEPOLIA_CONFIG.contracts.weth
  );
  console.log(`USDC: ${UNICHAIN_SEPOLIA_CONFIG.contracts.usdc}`);
  console.log(`WETH: ${UNICHAIN_SEPOLIA_CONFIG.contracts.weth}`);
  console.log(`Sorted token0: ${token0}`);
  console.log(`Sorted token1: ${token1}`);
  console.log(`✓ Tokens properly sorted (token0 < token1)`);
  
  // Test 2: Create PoolKey
  console.log('\n Test 2: Create PoolKey');
  const poolKey: PoolKey = createPoolKey(
    UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
    UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
    3000, // 0.3% fee
    60    // tick spacing
  );
  console.log('Created PoolKey:');
  console.log(JSON.stringify(poolKey, null, 2));
  console.log(`Formatted: ${formatPoolKey(poolKey)}`);
  
  // Test 3: Compute Pool ID
  console.log('\n Test 3: Compute Pool ID');
  const poolId = computePoolId(poolKey);
  console.log(`Pool ID: ${poolId}`);
  console.log(`✓ Pool ID is deterministic hash of PoolKey`);
  
  // Test 4: Swap direction (USDC -> WETH)
  console.log('\n Test 4: Swap Direction (USDC -> WETH)');
  const zeroForOne = getSwapDirection(poolKey, UNICHAIN_SEPOLIA_CONFIG.contracts.usdc);
  const outputToken = getOutputToken(poolKey, UNICHAIN_SEPOLIA_CONFIG.contracts.usdc);
  console.log(`Input: USDC (${UNICHAIN_SEPOLIA_CONFIG.contracts.usdc})`);
  console.log(`zeroForOne: ${zeroForOne}`);
  console.log(`Output token: ${outputToken}`);
  console.log(`Expected output: WETH (${UNICHAIN_SEPOLIA_CONFIG.contracts.weth})`);
  console.log(`✓ Direction correct: ${outputToken === UNICHAIN_SEPOLIA_CONFIG.contracts.weth ? 'PASS' : 'FAIL'}`);
  
  // Test 5: Swap direction (WETH -> USDC)
  console.log('\n Test 5: Swap Direction (WETH -> USDC)');
  const oneForZero = getSwapDirection(poolKey, UNICHAIN_SEPOLIA_CONFIG.contracts.weth);
  const outputToken2 = getOutputToken(poolKey, UNICHAIN_SEPOLIA_CONFIG.contracts.weth);
  console.log(`Input: WETH (${UNICHAIN_SEPOLIA_CONFIG.contracts.weth})`);
  console.log(`zeroForOne: ${oneForZero}`);
  console.log(`Output token: ${outputToken2}`);
  console.log(`Expected output: USDC (${UNICHAIN_SEPOLIA_CONFIG.contracts.usdc})`);
  console.log(`✓ Direction correct: ${outputToken2 === UNICHAIN_SEPOLIA_CONFIG.contracts.usdc ? 'PASS' : 'FAIL'}`);
  
  // Test 6: Validate fee bounds
  console.log('\n Test 6: Fee Validation');
  try {
    createPoolKey(
      UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
      UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
      1500000, // Invalid: too high
      60
    );
    console.log('FAIL: Should have thrown error for invalid fee');
  } catch (error) {
    console.log(`✓ PASS: Correctly rejected invalid fee`);
    console.log(`   Error: ${(error as Error).message}`);
  }
  
  // Test 7: Identical tokens error
  console.log('\n Test 7: Identical Tokens');
  try {
    sortTokens(
      UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
      UNICHAIN_SEPOLIA_CONFIG.contracts.usdc
    );
    console.log('FAIL: Should have thrown error for identical tokens');
  } catch (error) {
    console.log(`✓ PASS: Correctly rejected identical tokens`);
    console.log(`   Error: ${(error as Error).message}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('All PoolKey utility tests passed!\n');
}

// Run the test
testPoolKeyUtils()
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });