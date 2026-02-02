import 'dotenv/config';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

async function checkBalances() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  
  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
  });
  
  console.log('Checking balances for:', account.address);
  console.log('');
  
  // ETH Balance
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log('ETH:', formatEther(ethBalance));
  
  // WETH Balance
  const wethBalance = await publicClient.readContract({
    address: UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  console.log('WETH:', formatEther(wethBalance));
  
  // USDC Balance
  const usdcBalance = await publicClient.readContract({
    address: UNICHAIN_SEPOLIA_CONFIG.contracts.usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  console.log('USDC:', formatUnits(usdcBalance, 6)); // USDC has 6 decimals
}

checkBalances().catch(console.error);