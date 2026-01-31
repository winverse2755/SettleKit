import { TransferLeg, Chain } from '../core/TransferLeg';
import { ExecutionPlan } from '../core/ExecutionPlan';

const generateId = () =>
    `plan_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export class ArcLiquidityHub {
    async routeViaArc(
        source: Chain,
        destination: Chain,
        amount: string
    ): Promise<ExecutionPlan> {

        const legs = [
            new TransferLeg(source, 'arc', amount),
            new TransferLeg('arc', destination, amount)
        ];

        return {
            id: generateId(),
            legs,
            settlementGraph: this.generateMermaid(legs),
            riskProfile: await this.calculateRisk(legs)
        };
    }

    private generateMermaid(legs: TransferLeg[]): string {
        return `
graph TD
${legs.map(l => `${l.from} --> ${l.to}`).join('\n')}
    `;
    }

    private async calculateRisk(legs: TransferLeg[]) {
        return {
            hops: legs.length,
            throughArc: true,
            score: 0.1 * legs.length
        };
    }
}
