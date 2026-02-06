export type Chain = 'base' | 'arc' | 'unichain';

export class TransferLeg {
    constructor(
        public from: Chain,
        public to: Chain,
        public amount: string,
        public token: 'USDC' = 'USDC'
    ) { }
}
