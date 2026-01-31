// packages/sdk/src/legs/ArcTransferLeg.ts

import { Leg } from './leg';
import { LegEstimate, LegReceipt, RollbackStrategy } from '../types/leg-types';
import { Signer, ethers } from 'ethers';
import fetch from 'node-fetch';

type ArcTransferParams = {
    amount: string; // in 6 decimals
    recipient: string;
};

const USDC_BASE = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA';
const TOKEN_MESSENGER_BASE = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA';
const MESSAGE_TRANSMITTER_ARC = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA';

type CircleAttestationResponse = {
    status: 'pending' | 'complete';
    attestation: string;   // bytes
    message: string;       // bytes
};

export class ArcTransferLeg extends Leg {
    name = 'Arc USDC Transfer';

    private amount: string;
    private recipient: string;
    private apiKey = process.env.CIRCLE_API_KEY!;

    constructor(params: ArcTransferParams) {
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
            notes: 'Estimated CCTP transfer Base → Arc',
        };
    }

    async execute(signer: Signer): Promise<LegReceipt> {
        const address = await signer.getAddress();

        // 1) Approve USDC
        const usdc = new ethers.Contract(
            USDC_BASE,
            ['function approve(address spender, uint256 amount) public returns (bool)'],
            signer
        );

        await usdc.approve(TOKEN_MESSENGER_BASE, this.amount);

        // 2) Burn USDC via TokenMessenger (CCTP)
        const messenger = new ethers.Contract(
            TOKEN_MESSENGER_BASE,
            [
                'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external',
            ],
            signer
        );

        const destinationDomain = 9999; // Arc domain from Circle docs
        const mintRecipient = ethers.zeroPadValue(this.recipient, 32);

        const burnTx = await messenger.depositForBurn(
            this.amount,
            destinationDomain,
            mintRecipient,
            USDC_BASE
        );

        const receipt = await burnTx.wait();

        const messageHash = receipt.logs[0].topics[1]; // from event

        // 3) Wait for Circle attestation
        const attestation = await this.waitForAttestation(messageHash);

        // 4) Mint on Arc
        const transmitter = new ethers.Contract(
            MESSAGE_TRANSMITTER_ARC,
            [
                'function receiveMessage(bytes message, bytes attestation) external returns (bool)',
            ],
            signer
        );

        await transmitter.receiveMessage(attestation.message, attestation.attestation);

        return {
            txHash: burnTx.hash,
            chain: 'base',
            success: true,
        };
    }

    async waitForAttestation(messageHash: string): Promise<CircleAttestationResponse> {
        while (true) {
            const res = await fetch(
                `https://iris-api-sandbox.circle.com/attestations/${messageHash}`,
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                }
            );

            const json = (await res.json()) as CircleAttestationResponse;

            if (json.status === 'complete') return json;

            await new Promise((r) => setTimeout(r, 2000));
        }
    }


    async verify(): Promise<boolean> {
        return true;
    }

    getRollbackStrategy(): RollbackStrategy {
        return { type: 'retry', maxRetries: 2 };
    }
}
