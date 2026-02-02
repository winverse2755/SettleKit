import { Leg } from './leg';
import { LegEstimate, LegReceipt, RollbackStrategy } from '../types/leg-types';

import {
    createWalletClient,
    createPublicClient,
    http,
    parseUnits,
    decodeEventLog,
    keccak256
} from 'viem';

import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arcTestnet } from '../config/networks';
import fetch from 'node-fetch';

// ---------- helpers ----------
function asHex(value: string): `0x${string}` {
    if (!value.startsWith('0x')) {
        throw new Error(`Invalid hex string: ${value}`);
    }
    return value as `0x${string}`;
}

function addressToBytes32(address: string | undefined): `0x${string}` {
    if (!address) {
        throw new Error('addressToBytes32: address is undefined or empty');
    }
    const cleanAddress = address.toLowerCase().startsWith('0x') ? address.slice(2) : address;
    return `0x${cleanAddress.padStart(64, '0')}`;
}

// ---------- ENV ----------
const {
    USDC_BASE,
    TOKEN_MESSENGER_BASE,
    MESSAGE_TRANSMITTER_ARC,
    ARC_DOMAIN,
    BASE_RPC,
    ARC_RPC,
    CIRCLE_API_KEY
} = process.env as Record<string, string>;

// ---------- ABIs ----------
const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    }
] as const;

const TOKEN_MESSENGER_ABI = [
    {
        name: 'depositForBurn',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'mintRecipient', type: 'bytes32' },
            { name: 'burnToken', type: 'address' }
        ],
        outputs: []
    },
    {
        type: 'event',
        name: 'MessageSent',
        inputs: [{ indexed: false, name: 'message', type: 'bytes' }]
    }
] as const;

const MESSAGE_TRANSMITTER_ABI = [
    {
        name: 'receiveMessage',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'message', type: 'bytes' },
            { name: 'attestation', type: 'bytes' }
        ],
        outputs: []
    }
] as const;

// ===================================================

type CircleAttestationResponse = {
    status: 'pending' | 'complete';
    attestation?: `0x${string}`;
};

function isCircleAttestationResponse(
    x: unknown
): x is CircleAttestationResponse {
    return (
        typeof x === 'object' &&
        x !== null &&
        'status' in x &&
        (x as any).status &&
        (x as any).status !== undefined
    );
}

export interface ArcTransferParams {
    amount: string;
    recipient: string;
    privateKey: `0x${string}`;
}

export class ArcTransferLeg extends Leg {
    name = 'Arc USDC Transfer';

    private amount: string;
    private recipient: string;
    private privateKey: `0x${string}`;

    constructor(params: ArcTransferParams) {
        super();
        this.amount = params.amount;
        this.recipient = params.recipient;
        this.privateKey = params.privateKey;
    }

    requires() {
        return { chain: 'base', asset: 'USDC', owner: 'user' };
    }

    provides() {
        return { chain: 'arc', asset: 'USDC', owner: 'user' };
    }

    async estimate(): Promise<LegEstimate> {
        return {
            gasEstimate: 300000n,
            estimatedTimeMs: 900000, // 15 minutes
            failureProbability: 0.03,
            notes: 'CCTP transfer Base → Arc'
        };
    }

    async execute(): Promise<LegReceipt> {
        const account = privateKeyToAccount(this.privateKey);

        console.log(`  🔄 Transferring ${this.amount} USDC to Arc...`);

        // ---------- clients ----------
        const baseClient = createPublicClient({
            chain: baseSepolia,
            transport: http(BASE_RPC || 'https://sepolia.base.org')
        });

        const baseWallet = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(BASE_RPC || 'https://sepolia.base.org')
        });

        const arcClient = createPublicClient({
            chain: arcTestnet,
            transport: http(ARC_RPC || 'https://rpc.testnet.arc.network')
        });

        const arcWallet = createWalletClient({
            account,
            chain: arcTestnet,
            transport: http(ARC_RPC || 'https://rpc.testnet.arc.network')
        });

        const amount = parseUnits(this.amount, 6);

        // ---------- 1) Approve ----------
        console.log('  ✍️  Approving USDC...');
        await baseWallet.writeContract({
            address: asHex(USDC_BASE),
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [asHex(TOKEN_MESSENGER_BASE), amount]
        });

        // ---------- 2) Burn ----------
        console.log('  🔥 Burning USDC on Base...');
        const burnTx = await baseWallet.writeContract({
            address: asHex(TOKEN_MESSENGER_BASE),
            abi: TOKEN_MESSENGER_ABI,
            functionName: 'depositForBurn',
            args: [
                amount,
                Number(ARC_DOMAIN),
                addressToBytes32(this.recipient),
                asHex(USDC_BASE)
            ]
        });

        console.log(`  📤 Burn tx: ${burnTx}`);

        const receipt = await baseClient.waitForTransactionReceipt({
            hash: burnTx
        });

        // ---------- extract message ----------
        let messageBytes: `0x${string}` | undefined;

        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: TOKEN_MESSENGER_ABI,
                    data: log.data,
                    topics: log.topics
                });

                if (decoded.eventName === 'MessageSent') {
                    messageBytes = decoded.args.message;
                }
            } catch { }
        }

        if (!messageBytes) throw new Error('Message not found in logs');

        // ---------- 3) Attestation ----------
        console.log('  ⏳ Waiting for Circle attestation (5-15 min)...');
        const attestation = await this.waitForAttestation(messageBytes);

        // ---------- 4) Mint on Arc ----------
        console.log('  🪙 Minting USDC on Arc...');
        const mintTx = await arcWallet.writeContract({
            address: asHex(MESSAGE_TRANSMITTER_ARC),
            abi: MESSAGE_TRANSMITTER_ABI,
            functionName: 'receiveMessage',
            args: [messageBytes, attestation]
        });

        console.log(`  📤 Mint tx: ${mintTx}`);

        await arcClient.waitForTransactionReceipt({ hash: mintTx });

        console.log('  ✅ Transfer complete!');

        return {
            txHash: burnTx,
            chain: 'base',
            success: true
        };
    }

    async waitForAttestation(message: `0x${string}`): Promise<`0x${string}`> {
        const hash = keccak256(message);
        let attempts = 0;
        const maxAttempts = 180; // 6 minutes (2s interval)

        while (attempts < maxAttempts) {
            const raw = await fetch(
                `https://iris-api-sandbox.circle.com/attestations/${hash}`,
                {
                    headers: { Authorization: `Bearer ${CIRCLE_API_KEY}` }
                }
            );

            const data = await raw.json();

            if (!isCircleAttestationResponse(data)) {
                throw new Error('Invalid attestation response from Circle');
            }

            if (data.status === 'complete' && data.attestation) {
                return data.attestation;
            }

            attempts++;
            await new Promise(r => setTimeout(r, 2000));
        }

        throw new Error('Attestation timeout after 6 minutes');
    }

    async verify(): Promise<boolean> {
        return true;
    }

    getRollbackStrategy(): RollbackStrategy {
        return { type: 'retry', maxRetries: 2 };
    }
}