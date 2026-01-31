import { TransferLeg } from './TransferLeg';

export interface ExecutionPlan {
    id: string;
    legs: TransferLeg[];
    settlementGraph: string;
    riskProfile: any;
}
