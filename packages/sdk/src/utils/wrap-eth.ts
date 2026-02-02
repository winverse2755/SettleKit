
import 'dotenv/config';
import { 
  createWalletClient, 
  createPublicClient,
  http, 
  parseEther, 
  formatEther 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia, UNICHAIN_SEPOLIA_CONFIG } from '../config/networks';

// WETH9 ABI (deposit function)
const WETH_ABI = [
  {
    constant: false,
    inputs: [],
    name: 'deposit',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function wrapEth() {
  console.log('ETH → WETH Wrapper\n');
  
  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY not found in environment');
    console.log('Set it with: export PRIVATE_KEY=0x...');
    process.exit(1);
  }
  
  const account = privateKeyToAccount(privateKey);
  
  // Create public client for reading
  const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
  });
  
  // Create wallet client for writing
  const walletClient = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http(),
  });
  
  console.log('Wallet:', account.address);
  
  // Get current balances
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log('ETH Balance:', formatEther(ethBalance), 'ETH');
  
  const wethBalance = await publicClient.readContract({
    address: UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
    abi: WETH_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  console.log('WETH Balance:', formatEther(wethBalance), 'WETH\n');
  
  // How much to wrap? (0.01 ETH = enough for testing)
  const amountToWrap = parseEther('0.01');
  
  if (ethBalance < amountToWrap) {
    console.error('Not enough ETH! You have:', formatEther(ethBalance), 'ETH');
    console.log('Need at least:', formatEther(amountToWrap), 'ETH to wrap');
    process.exit(1);
  }
  
  console.log('Wrapping', formatEther(amountToWrap), 'ETH → WETH...');
  
  // Execute the wrap
  const hash = await walletClient.writeContract({
    address: UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
    abi: WETH_ABI,
    functionName: 'deposit',
    value: amountToWrap,
  });
  
  console.log('Wrap transaction sent!');
  console.log('Tx Hash:', hash);
  console.log('View on explorer:', `https://sepolia.uniscan.xyz/tx/${hash}`);
  
  console.log('\n⏳ Waiting for confirmation...');
  
  // Wait for transaction
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log('Wrap successful!');
    
    // Check new balance
    const newWethBalance = await publicClient.readContract({
      address: UNICHAIN_SEPOLIA_CONFIG.contracts.weth,
      abi: WETH_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }) as bigint;
    
    console.log('New WETH Balance:', formatEther(newWethBalance), 'WETH');
  } else {
    console.log('Wrap failed!');
  }
}

wrapEth().catch(console.error);