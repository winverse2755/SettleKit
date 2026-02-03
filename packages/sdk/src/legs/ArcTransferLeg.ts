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
import { baseSepolia } from 'viem/chains';
import fetch from 'node-fetch';

// ---------- helpers ----------
function asHex(value: string): `0x${string}` {
    if (!value.startsWith('0x')) {
        throw new Error(`Invalid hex string: ${value}`);
    }
    return value as `0x${string}`;
}

function addressToBytes32(address: string): `0x${string}` {
    return `0x${address.slice(2).padStart(64, '0')}`;
}

// ---------- ENV ----------
const {
    USDC_BASE,
    TOKEN_MESSENGER_BASE,
    MESSAGE_TRANSMITTER_ARC,
    ARC_DOMAIN,
    BASE_RPC,
    ARC_RPC,
    PRIVATE_KEY,
    CIRCLE_API_KEY
} = process.env as Record<string, string>;

// ---------- ARC CHAIN (custom) ----------
const arcTestnet = {
    id: 999999, // ⚠️ reemplazar por el real chainId de Arc testnet
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [ARC_RPC] }
    }
} as const;

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


export class ArcTransferLeg extends Leg {
    name = 'Arc USDC Transfer';

    private amount: string;
    private recipient: string;

    constructor(params: { amount: string; recipient: string }) {
        super();
        this.amount = params.amount;
        this.recipient = params.recipient;
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
            estimatedTimeMs: 20000,
            failureProbability: 0.03,
            notes: 'CCTP transfer Base → Arc'
        };
    }

    async execute(): Promise<LegReceipt> {
        const account = privateKeyToAccount(asHex(PRIVATE_KEY));

        // ---------- clients ----------
        const baseClient = createPublicClient({
            chain: baseSepolia,
            transport: http(BASE_RPC)
        });

        const baseWallet = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(BASE_RPC)
        });

        const arcClient = createPublicClient({
            chain: arcTestnet,
            transport: http(ARC_RPC)
        });

        const arcWallet = createWalletClient({
            account,
            chain: arcTestnet,
            transport: http(ARC_RPC)
        });

        const amount = parseUnits(this.amount, 6);

        // ---------- 1) Approve ----------
        await baseWallet.writeContract({
            address: asHex(USDC_BASE),
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [asHex(TOKEN_MESSENGER_BASE), amount]
        });

        // ---------- 2) Burn ----------
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

        if (!messageBytes) throw new Error('Message not found');

        // ---------- 3) Attestation ----------
        const attestation = await this.waitForAttestation(messageBytes);

        // ---------- 4) Mint on Arc ----------
        const mintTx = await arcWallet.writeContract({
            address: asHex(MESSAGE_TRANSMITTER_ARC),
            abi: MESSAGE_TRANSMITTER_ABI,
            functionName: 'receiveMessage',
            args: [messageBytes, attestation]
        });

        await arcClient.waitForTransactionReceipt({ hash: mintTx });

        return {
            txHash: burnTx,
            chain: 'base',
            success: true
        };
    }

    async waitForAttestation(message: `0x${string}`): Promise<`0x${string}`> {
        const hash = keccak256(message);

        while (true) {
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
                return data.attestation; // ahora TypeScript sabe que es `0x${string}`
            }

            await new Promise(r => setTimeout(r, 2000));
        }
    }

    async verify(): Promise<boolean> {
        return true;
    }

    getRollbackStrategy(): RollbackStrategy {
        return { type: 'retry', maxRetries: 2 };
    }
}
