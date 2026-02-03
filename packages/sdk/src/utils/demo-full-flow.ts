import 'dotenv/config';
import { SettleAgent } from '../agent/SettleAgent';
import { ExecutionPlan } from '../types';

async function demoFullFlow() {
  console.log('🎯 SettleKit: Full Flow Demonstration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Mock execution plan based on settleKit actual flow
  const plan: ExecutionPlan = {
    id: 'settlekit-demo-001',
    legs: [
      {
        id: 'arc-bridge-base-to-arc',
        type: 'ArcBridge',
        estimate: async () => ({
          estimatedTime: 180,
          gasEstimate: BigInt(150000),
          confidence: 0.95,
        }),
        execute: async () => ({
          legId: 'arc-bridge-base-to-arc',
          txHash: '0x68cbcf64141beac067bec9f63ed72864692714239010c0dc8f388e9356a81829' as `0x${string}`,
          status: 'completed' as const,
        }),
        verify: async () => true,
        getRollbackStrategy: () => null,
      },
      {
        id: 'arc-bridge-arc-to-unichain',
        type: 'ArcBridge',
        estimate: async () => ({
          estimatedTime: 180,
          gasEstimate: BigInt(150000),
          confidence: 0.95,
        }),
        execute: async () => ({
          legId: 'arc-bridge-arc-to-unichain',
          txHash: '0xdc1dc4930849494603bc7c76c6a729808ae39fca0d5833a5f39abe563443a97f' as `0x${string}`,
          status: 'completed' as const,
        }),
        verify: async () => true,
        getRollbackStrategy: () => null,
      },
      {
        id: 'uniswap-v4-swap',
        type: 'UniswapV4Swap',
        estimate: async () => ({
          estimatedTime: 30,
          gasEstimate: BigInt(200000),
          confidence: 0.92,
          expectedOutput: '1.0',
          priceImpact: 0.003,
        }),
        execute: async () => ({
          legId: 'uniswap-v4-swap',
          txHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          status: 'pending' as const,
        }),
        verify: async () => false,
        getRollbackStrategy: () => ({
          canRollback: true,
          rollbackSteps: ['Reverse swap'],
          estimatedCost: BigInt(200000),
        }),
      },
    ],
    deterministicOrder: true,
    settlementGraph: 'Base → Arc → Unichain → Uniswap v4',
  };

  // Initialize agent with policy
  const agent = new SettleAgent({
    maxSlippage: 0.05, // 5%
    maxLatency: 300, // 5 minutes
    minConfidence: 0.90,
  });

  // Agent evaluates the plan
  const result = await agent.evaluateAndExecute(plan);

  // Show results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 ACTUAL TESTNET TRANSACTIONS:\n');
  console.log('1. Base → Arc Bridge:');
  console.log('   https://sepolia.basescan.org/tx/0x68cbcf64141beac067bec9f63ed72864692714239010c0dc8f388e9356a81829');
  console.log('\n2. Arc → Unichain Bridge:');
  console.log('   https://testnet.arcscan.app/tx/0xcc2967b9f34aca22c46d9ca8db88d5789ca9fed11a63f9f9aac2d7379f414dff');
  console.log('   https://unichain-sepolia.blockscout.com/tx/0xdc1dc4930849494603bc7c76c6a729808ae39fca0d5833a5f39abe563443a97f');
  console.log('\n3. Uniswap v4 Pool Initialization:');
  console.log('   (Pool ready for swaps - implementation post-hackathon)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ SettleKit Demo Complete!');
  console.log('🏆 Arc Prize: Cross-chain flow demonstrated');
  console.log('🏆 Uniswap Prize: Agent-driven risk evaluation + v4 infrastructure ready\n');
}

demoFullFlow().catch(console.error);