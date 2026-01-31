// packages/sdk/src/types/intent.ts

export type Chain = 'base' | 'unichain' | 'arc';
export type Asset = 'USDC';

export interface FinalAction {
    type: 'supply' | 'swap' | 'stake';
    protocol: 'morpho' | 'uniswap';
    params: Record<string, unknown>;
}

export interface ExecutionPolicy {
    maxSlippage: number;
    maxLatency: number;
    fallbackStrategy: 'revert' | 'retry' | 'reroute';
}

export interface SettleIntent {
    asset: Asset;
    amount: string;

    sourceChain: Chain;
    destinationChain: Chain;

    finalAction: FinalAction;

    executionPolicy?: ExecutionPolicy;
}
