// packages/sdk/src/legs/leg.ts

import { Signer } from 'ethers';
import { LegEstimate, LegReceipt, RollbackStrategy } from '../types/leg-types';

export type ChainState = {
    chain: string;
    asset: string;
    owner: string;
};

export abstract class Leg {
    abstract name: string;

    abstract requires(): ChainState;
    abstract provides(): ChainState;

    abstract estimate(): Promise<LegEstimate>;
    abstract execute(signer: Signer): Promise<LegReceipt>;
    abstract verify(txHash: string): Promise<boolean>;
    abstract getRollbackStrategy(): RollbackStrategy | null;
}
