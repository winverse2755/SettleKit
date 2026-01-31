export type Chain = 'base' | 'arc' | 'polygon' | 'ethereum';

export class TransferLeg {
    constructor(
        public from: Chain,
        public to: Chain,
        public amount: string,
        public token: 'USDC' = 'USDC'
    ) { }
}
