import {
    createWalletClient,
    http,
    parseUnits
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';

import 'dotenv/config';

// -------------------- ENV --------------------
const {
    ARC_RPC,
    PRIVATE_KEY,
    USDC_ARC,
    RECIPIENT
} = process.env as Record<string, string>;

// -------------------- HELPERS --------------------
function asHex(value: string): `0x${string}` {
    if (!value.startsWith('0x')) throw new Error(`Invalid hex string: ${value}`);
    return value as `0x${string}`;
}

// -------------------- CHAINS --------------------
const ARC_CHAIN = {
    id: 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC] } }
} as const;

// -------------------- ERC20 ABI --------------------
const ERC20_TRANSFER_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    }
] as const;

// -------------------- MAIN --------------------
async function main() {
    const account = privateKeyToAccount(asHex(PRIVATE_KEY));
    const RECIPIENT = process.env.RECIPIENT ?? account.address;

    console.log('🧍 Sender:', account.address);
    console.log('🎯 Recipient:', RECIPIENT);

    // -------- BridgeKit setup --------
    const kit = new BridgeKit();

    const adapter = createViemAdapterFromPrivateKey({
        privateKey: asHex(PRIVATE_KEY)
    });

    console.log('🌉 Bridging USDC Base → Arc using BridgeKit...');

    const amount = '1'; // 1 USDC

    const result = await kit.bridge({
        from: { adapter, chain: 'Base_Sepolia' },
        to: { adapter, chain: 'Arc_Testnet' },
        amount
    });

    for (const step of result.steps) {
        console.log(`✅ ${step.name}:`, step.txHash);
    }

    if (result.state !== 'success') {
        throw new Error('Bridge failed');
    }

    console.log('🪙 USDC minted on Arc to sender wallet');

    // -------- Transfer to recipient --------
    const arcWallet = createWalletClient({
        account,
        chain: ARC_CHAIN,
        transport: http(ARC_RPC)
    });

    console.log('➡️ Transferring USDC to recipient...');

    await arcWallet.writeContract({
        address: asHex(USDC_ARC),
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [
            asHex(RECIPIENT),
            parseUnits(amount, 6)
        ]
    });

    console.log('🎉 Transfer complete!');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
