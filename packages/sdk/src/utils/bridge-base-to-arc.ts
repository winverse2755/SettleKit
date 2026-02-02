import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { inspect } from 'util';

async function bridgeToArc() {
  console.log('🌉 Bridging USDC: Base Sepolia → Arc Testnet (Bridge Kit)\n');

  // Initialize Bridge Kit
  const kit = new BridgeKit();

  // Create adapter from your private key
  const adapter = createAdapterFromPrivateKey({
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  });

  console.log('Starting bridge transfer...\n');

  try {
    // Bridge 5 USDC from Base Sepolia to Arc Testnet
    const result = await kit.bridge({
      from: {
        adapter,
        chain: 'Base_Sepolia',
      },
      to: {
        adapter,
        chain: 'Arc_Testnet',
      },
      amount: '5.00',
    });

    console.log('✅ Bridge Complete!\n');
    console.log('Result:', inspect(result, false, null, true));
  } catch (error) {
    console.error('❌ Bridge failed:', error);
  }
}

bridgeToArc().catch(console.error);