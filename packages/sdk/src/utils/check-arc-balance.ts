import 'dotenv/config';
import { createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from '../config/networks';

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function checkArcBalance() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(process.env.ARC_RPC || 'https://5042002.rpc.thirdweb.com'),
  });

  console.log('👛 Checking Arc Testnet balance for:', account.address);
  console.log('');

  // USDC on Arc (also used for gas)
  const usdcArc = '0x3600000000000000000000000000000000000000' as `0x${string}`;

  const usdcBalance = (await publicClient.readContract({
    address: usdcArc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })) as bigint;

  console.log('💵 USDC (gas token):', formatUnits(usdcBalance, 6), 'USDC');
}

checkArcBalance().catch(console.error);