// packages/sdk/src/legs/MorphoSupplyLeg.ts

import { Leg } from './leg';
import { LegEstimate, LegReceipt, RollbackStrategy } from '../types/leg-types';
import { Signer } from 'ethers';

export class MorphoSupplyLeg extends Leg {
    name = 'Morpho Supply';

    requires() {
        return {
            chain: 'unichain',
            asset: 'USDC',
            owner: 'user',
        };
    }

    provides() {
        return {
            chain: 'unichain',
            asset: 'morphoUSDC',
            owner: 'user',
        };
    }

    async estimate(): Promise<LegEstimate> {
        return {
            gasEstimate: 0n,
            estimatedTimeMs: 4000,
            failureProbability: 0.01,
            notes: 'Mock estimate for Morpho supply',
        };
    }

    async execute(_signer: Signer): Promise<LegReceipt> {
        return {
            txHash: '0xMOCK',
            chain: 'unichain',
            success: true,
        };
    }

    async verify(_txHash: string): Promise<boolean> {
        return true;
    }

    getRollbackStrategy(): RollbackStrategy {
        return { type: 'none' };
    }
}
