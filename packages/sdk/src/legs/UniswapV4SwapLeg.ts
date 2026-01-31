// packages/sdk/src/legs/UniswapV4SwapLeg.ts

import { Leg } from './leg';
import { LegEstimate, LegReceipt, RollbackStrategy } from '../types/leg-types';
import { Signer } from 'ethers';

export class UniswapV4SwapLeg extends Leg {
    name = 'Uniswap v4 Swap';

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
            asset: 'TARGET_ASSET',
            owner: 'user',
        };
    }

    async estimate(): Promise<LegEstimate> {
        return {
            gasEstimate: 0n,
            estimatedTimeMs: 3000,
            failureProbability: 0.03,
            notes: 'Mock estimate for Uniswap v4 swap',
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
        return { type: 'retry', maxRetries: 1 };
    }
}
