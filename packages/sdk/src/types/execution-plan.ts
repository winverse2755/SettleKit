// packages/sdk/src/types/execution-plan.ts

import { Leg } from '../legs/leg';
import { RiskReport } from './risk';

export interface ExecutionPlan {
    id: string;
    legs: Leg[];
    deterministicOrder: true;
    settlementGraph: string; // mermaid
    riskProfile: RiskReport;
}
