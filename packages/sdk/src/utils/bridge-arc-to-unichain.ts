import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { inspect } from 'util';

async function bridgeToUnichain() {
  console.log('🌉 Bridging USDC: Arc Testnet → Unichain Sepolia (Bridge Kit)\n');

  try {
    // Initialize Bridge Kit
    const kit = new BridgeKit();
    console.log('✅ Bridge Kit initialized');

    // Create adapter from your private key
    const adapter = createAdapterFromPrivateKey({
      privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    });
    console.log('✅ Adapter created');

    console.log('\n📤 Starting bridge transfer...');
    console.log('   From: Arc_Testnet');
    console.log('   To: Unichain_Sepolia');
    console.log('   Amount: 3.00 USDC\n');

    // Bridge 3 USDC from Arc Testnet to Unichain Sepolia
    const result = await kit.bridge({
      from: {
        adapter,
        chain: 'Arc_Testnet',
      },
      to: {
        adapter,
        chain: 'Unichain_Sepolia',
      },
      amount: '3.00',
    });

    console.log('✅ Bridge Complete!\n');
    console.log('Result:', inspect(result, false, null, true));
    
    console.log('\n📋 Transaction Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.steps) {
      result.steps.forEach((step: any) => {
        if (step.explorerUrl) {
          console.log(`${step.name.toUpperCase()}:`, step.explorerUrl);
        }
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 You now have USDC on Unichain Sepolia!');
    console.log('🎯 Next: Swap USDC → WETH on Uniswap v4');
  } catch (error: any) {
    console.error('\n❌ Bridge failed!');
    console.error('Error:', inspect(error, false, null, true));
    
    if (error.code) {
      console.error('\nError Code:', error.code);
    }
    if (error.cause) {
      console.error('Cause:', inspect(error.cause, false, null, true));
    }
  }
}

bridgeToUnichain().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});