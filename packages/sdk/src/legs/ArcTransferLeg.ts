import { Leg } from './leg';
import { LegEstimate, LegReceipt, RollbackStrategy } from '../types/leg-types';

import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';

import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ---------- helpers ----------
function asHex(value: string): `0x${string}` {
    if (!value.startsWith('0x')) {
        throw new Error(`Invalid hex string: ${value}`);
    }
    return value as `0x${string}`;
}

// ---------- minimal ERC20 ABI ----------
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

// ---------- ENV ----------
const {
    PRIVATE_KEY,
    ARC_RPC,
    USDC_ARC
} = process.env as Record<string, string>;

const arcTestnet = {
    id: 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [ARC_RPC] }
    }
} as const;

// ===================================================

export class ArcTransferLeg extends Leg {
    name = 'Arc USDC Transfer (BridgeKit)';

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
            gasEstimate: 250000n,
            estimatedTimeMs: 20000,
            failureProbability: 0.02,
            notes: 'BridgeKit CCTP transfer Base → Arc'
        };
    }

    async execute(): Promise<LegReceipt> {
        const kit = new BridgeKit();

        const adapter = createViemAdapterFromPrivateKey({
            privateKey: asHex(PRIVATE_KEY)
        });

        // -------- 1) Bridge Base → Arc (mint to sender wallet) --------
        const result = await kit.bridge({
            from: { adapter, chain: 'Base_Sepolia' },
            to: { adapter, chain: 'Arc_Testnet' },
            amount: this.amount
        });

        for (const step of result.steps) {
            console.log(`[BridgeKit] ${step.name}`, step.txHash);
        }

        // -------- 2) Transfer USDC to recipient on Arc --------
        const arcWallet = createWalletClient({
            account: privateKeyToAccount(asHex(PRIVATE_KEY)),
            chain: arcTestnet,
            transport: http(ARC_RPC)
        });

        await arcWallet.writeContract({
            address: USDC_ARC as `0x${string}`,
            abi: ERC20_TRANSFER_ABI,
            functionName: 'transfer',
            args: [
                this.recipient as `0x${string}`,
                parseUnits(this.amount, 6)
            ]
        });

        const mintStep = result.steps.find(s => s.name === 'mint');

        return {
            txHash: mintStep?.txHash ?? '',
            chain: 'arc',
            success: result.state === 'success'
        };
    }

    async verify(): Promise<boolean> {
        return true;
    }

    getRollbackStrategy(): RollbackStrategy {
        return { type: 'retry', maxRetries: 2 };
    }
}
