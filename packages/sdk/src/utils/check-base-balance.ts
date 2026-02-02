import 'dotenv/config';
import { createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from '../config/networks';

const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

async function checkBaseBalance() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
  
  console.log('👛 Checking Base Sepolia balances for:', account.address);
  console.log('');
  
  // ETH Balance
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log('💰 ETH:', (Number(ethBalance) / 1e18).toFixed(6));
  
  // USDC Balance (from your .env)
  const usdcAddress = process.env.USDC_BASE as `0x${string}`;
  const usdcBalance = await publicClient.readContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  console.log('💵 USDC:', formatUnits(usdcBalance, 6));
}

checkBaseBalance().catch(console.error);