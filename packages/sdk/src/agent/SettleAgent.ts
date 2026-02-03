import { ExecutionPlan, RiskReport } from '../types';

export interface AgentPolicy {
  maxSlippage: number; // e.g., 0.05 = 5%
  maxLatency: number; // seconds
  minConfidence: number; // 0-1
}

export class SettleAgent {
  private policy: AgentPolicy;

  constructor(policy: AgentPolicy) {
    this.policy = policy;
  }

  async evaluateAndExecute(plan: ExecutionPlan): Promise<{
    decision: 'execute' | 'reject' | 'defer';
    reason: string;
    riskReport: RiskReport;
  }> {
    console.log('\n🤖 SettleAgent: Evaluating execution plan...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Simulate risk analysis
    const riskReport = this.simulateRisk(plan);

    console.log('📊 Risk Analysis:');
    console.log(`   Slippage (p95): ${(riskReport.slippage_p95! * 100).toFixed(2)}%`);
    console.log(`   Finality delay (p50): ${riskReport.finality_delay_p50}s`);
    console.log(`   Finality delay (p95): ${riskReport.finality_delay_p95}s`);
    console.log(`   Atomicity: ${riskReport.atomicity}`);
    console.log(`   Capital at risk: ${riskReport.capital_at_risk_seconds}s`);

    // Decision logic
    let decision: 'execute' | 'reject' | 'defer';
    let reason: string;

    if (riskReport.slippage_p95! > this.policy.maxSlippage) {
      decision = 'reject';
      reason = `Slippage ${(riskReport.slippage_p95! * 100).toFixed(2)}% exceeds max ${(this.policy.maxSlippage * 100)}%`;
    } else if (riskReport.finality_delay_p95 > this.policy.maxLatency) {
      decision = 'defer';
      reason = `Latency ${riskReport.finality_delay_p95}s exceeds max ${this.policy.maxLatency}s`;
    } else {
      decision = 'execute';
      reason = 'Risk parameters within acceptable thresholds';
    }

    console.log(`\n✅ Decision: ${decision.toUpperCase()}`);
    console.log(`   Reason: ${reason}\n`);

    return { decision, reason, riskReport };
  }

  private simulateRisk(plan: ExecutionPlan): RiskReport {
    // Simulate based on plan legs
    const numLegs = plan.legs.length;

    return {
      finality_delay_p50: numLegs * 15, // ~15s per leg median
      finality_delay_p95: numLegs * 45, // ~45s per leg p95
      capital_at_risk_seconds: numLegs * 30,
      atomicity: 'non-atomic' as const,
      reversibleLegs: plan.legs.filter(() => Math.random() > 0.3).map(l => l.id),
      terminalLegs: plan.legs.filter(() => Math.random() > 0.7).map(l => l.id),
      crossChainEfficiency: 0.92,
      fragmentationScore: 0.15,
      slippage_p95: 0.003, // 0.3%
    };
  }
}