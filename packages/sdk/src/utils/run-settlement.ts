import 'dotenv/config';
import { ArcTransferLeg } from '../legs/ArcTransferLeg';
import { privateKeyToAccount } from 'viem/accounts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const USDC_AMOUNT = '5';    // Amount to bridge from Base → Arc

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not set in .env');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

// ---------------------------------------------------------------------------
// Main Settlement Flow
// ---------------------------------------------------------------------------
async function runSettlement() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║              SettleKit - Cross-Chain Settlement              ║');
  console.log('║                                                              ║');
  console.log('║  Flow: Base → Arc → Unichain → Uniswap v4 → Morpho          ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`👛 Wallet: ${account.address}`);
  console.log(`📊 Settlement Plan:`);
  console.log(`   1️⃣  Bridge ${USDC_AMOUNT} USDC: Base Sepolia → Arc Testnet (CCTP)`);
  console.log(`   2️⃣  Bridge ${USDC_AMOUNT} USDC: Arc Testnet → Unichain Sepolia (CCTP)`);
  console.log(`   3️⃣  Swap ${USDC_AMOUNT} USDC → WETH on Uniswap v4`);
  console.log(`   4️⃣  Supply WETH to Morpho Blue`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const startTime = Date.now();
  const results: any[] = [];

  try {
    // -----------------------------------------------------------------------
    // LEG 1: Base → Arc (via raw CCTP)
    // -----------------------------------------------------------------------
    console.log('🌉 LEG 1/4: Base Sepolia → Arc Testnet (Circle CCTP)');
    console.log('───────────────────────────────────────────────────────────────');

    const leg1 = new ArcTransferLeg({
      amount: USDC_AMOUNT,
      recipient: account.address,
      privateKey: PRIVATE_KEY,
    });

    const leg1Estimate = await leg1.estimate();
    console.log(`  ⏱️  Estimated time: ${Math.round(leg1Estimate.estimatedTimeMs / 60000)} minutes`);
    console.log(`  ⛽ Gas estimate: ${leg1Estimate.gasEstimate.toString()}`);
    console.log('');

    const leg1Result = await leg1.execute();
    results.push({ leg: 'Base → Arc', ...leg1Result });

    if (leg1Result.success) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
    } else {
      throw new Error('Leg 1 failed — aborting settlement');
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log('✨ SETTLEMENT COMPLETE ✨');
    console.log('');
    console.log(`⏱️  Total time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
    console.log('');
    console.log('📋 EXECUTION SUMMARY:');
    console.log('───────────────────────────────────────────────────────────────');

    results.forEach((r, i) => {
      const icon = r.success ? '✅' : '❌';
      console.log(`${i + 1}. ${icon} ${r.leg}`);
      if (r.txHash) {
        console.log(`   Tx: ${r.txHash}`);
      }
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎯 HACKATHON DEMO STATUS:');
    console.log('');
    console.log('   ✅ Arc Prize: LEG 1 COMPLETE');
    console.log('      - Base → Arc bridge working (raw CCTP)');
    console.log('      - Transaction hash captured ✓');
    console.log('');
    console.log('   ⏳ Remaining legs (Arc → Unichain, Swap, Supply)');
    console.log('      - To be implemented following same pattern');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ Settlement failed:', error);
    console.log('\n📋 Partial results:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.leg}: ${r.success ? 'success' : 'failed'}`);
    });
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
runSettlement().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});