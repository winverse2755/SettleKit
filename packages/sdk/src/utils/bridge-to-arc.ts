import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodePacked,
  keccak256,
  pad,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from '../config/networks';

// ERC20 ABI
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// TokenMessenger ABI
const TOKEN_MESSENGER_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    outputs: [{ name: 'nonce', type: 'uint64' }],
  },
] as const;

async function bridgeToArc() {
  console.log('🌉 Bridging USDC: Base Sepolia → Arc Testnet\n');

  // Load environment variables
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const usdcBase = process.env.USDC_BASE as `0x${string}`;
  const tokenMessengerBase = process.env.TOKEN_MESSENGER_BASE as `0x${string}`;
  const arcDomain = parseInt(process.env.ARC_DOMAIN || '26');

  if (!privateKey || !usdcBase || !tokenMessengerBase) {
    throw new Error('Missing environment variables');
  }

  const account = privateKeyToAccount(privateKey);

  // Clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  console.log('👛 Wallet:', account.address);
  console.log('🌐 Destination: Arc Testnet (Domain', arcDomain, ')\n');

  // Check USDC balance
  const balance = (await publicClient.readContract({
    address: usdcBase,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })) as bigint;

  console.log('💰 Base USDC Balance:', formatUnits(balance, 6), 'USDC\n');

  // Amount to bridge (5 USDC for testing)
  const amountToBridge = parseUnits('5', 6);

  if (balance < amountToBridge) {
    throw new Error(`Insufficient USDC. Need ${formatUnits(amountToBridge, 6)} USDC`);
  }

  console.log('📤 Bridging Amount:', formatUnits(amountToBridge, 6), 'USDC\n');

  // Step 1: Check allowance
  console.log('🔍 Checking allowance...');
  const allowance = (await publicClient.readContract({
    address: usdcBase,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, tokenMessengerBase],
  })) as bigint;

  // Step 2: Approve if needed
  if (allowance < amountToBridge) {
    console.log('✍️  Approving TokenMessenger...');
    const approveHash = await walletClient.writeContract({
      address: usdcBase,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [tokenMessengerBase, amountToBridge],
    });

    console.log('   Tx:', approveHash);
    console.log('   Waiting for confirmation...');
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('✅ Approval confirmed\n');
  } else {
    console.log('✅ Already approved\n');
  }

  // Step 3: Burn USDC on Base (initiates bridge)
  console.log('🔥 Burning USDC on Base...');

  // Convert recipient address to bytes32 (left-padded)
  const mintRecipient = pad(account.address, { size: 32 }) as `0x${string}`;

  const burnHash = await walletClient.writeContract({
    address: tokenMessengerBase,
    abi: TOKEN_MESSENGER_ABI,
    functionName: 'depositForBurn',
    args: [amountToBridge, arcDomain, mintRecipient, usdcBase],
  });

  console.log('🔗 Burn Tx:', burnHash);
  console.log('📍 Explorer:', `https://sepolia.basescan.org/tx/${burnHash}`);
  console.log('\n⏳ Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });

  if (receipt.status === 'success') {
    console.log('✅ Burn successful!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Circle will attest this message (~5-15 minutes)');
    console.log('   2. Use Circle Attestation API to get attestation');
    console.log('   3. Call receiveMessage() on Arc to mint USDC');
    console.log('\n🔍 Monitor status:');
    console.log('   https://testnet.arcscan.app/');
    console.log('\n💡 Your USDC will appear on Arc after attestation is complete');
  } else {
    console.log('❌ Burn failed!');
  }
}

bridgeToArc().catch(console.error);