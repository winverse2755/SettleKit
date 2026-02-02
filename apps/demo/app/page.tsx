'use client';

import { useState } from 'react';
// import { SettleAgent } from '@settlekit/sdk/agent';

type Intent = {
  poolId: string;
  amountIn: string;
  tokenOut: string;
};

export default function Demo() {
  const [intent, setIntent] = useState<Intent>({
    poolId: '',
    amountIn: '100000000',
    tokenOut: 'WETH',
  });

  const [plan, setPlan] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingExec, setLoadingExec] = useState(false);

  // Modify later
  const fakeAgent = {
    policy: {
      max_slippage: 1.0,
      max_latency_seconds: 300,
      min_confidence: 0.8,
    },

    async plan(intent: any) {
      return {
        route: ['Base → Arc', 'Arc → Uniswap'],
        estimatedLatency: 120,
        confidence: 0.87,
      };
    },

    async evaluateAndExecute(intent: any) {
      return {
        status: 'completed',
        txHash: '0xabc123...',
        risk: {
          confidence: 0.87,
          latency: 120,
          slippage: 0.6,
          decision: 'EXECUTE',
        },
      };
    },
  };

  const agent = fakeAgent;

  // Modify by this when agent is ready
  // const agent = new SettleAgent({
  //     max_slippage: 1.0,
  //     max_latency_seconds: 300,
  //     max_price_impact: 2.0,
  //     min_confidence: 0.8,
  //     retry_attempts: 2,
  //     retry_delay_seconds: 30,
  //     fallback_strategy: 'wait',
  // });

  const handleChange = (key: keyof Intent, value: string) => {
    setIntent((prev) => ({ ...prev, [key]: value }));
  };

  const runPlan = async () => {
    setLoadingPlan(true);
    setResult(null);

    try {
      const p = await agent.plan(intent);
      setPlan(p);
    } catch (e) {
      console.error(e);
    }

    setLoadingPlan(false);
  };

  const runExecution = async () => {
    setLoadingExec(true);

    try {
      const r = await agent.evaluateAndExecute(intent);
      setResult(r);
    } catch (e) {
      console.error(e);
    }

    setLoadingExec(false);
  };

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold">SettleKit Agent Demo</h1>

      {/* Intent Inputs */}
      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold">1. Define Intent</h2>

        <input
          placeholder="Pool ID (0x...)"
          value={intent.poolId}
          onChange={(e) => handleChange('poolId', e.target.value)}
          className="w-full border p-3 rounded"
        />

        <input
          placeholder="Amount In (USDC base units)"
          value={intent.amountIn}
          onChange={(e) => handleChange('amountIn', e.target.value)}
          className="w-full border p-3 rounded"
        />

        <select
          value={intent.tokenOut}
          onChange={(e) => handleChange('tokenOut', e.target.value)}
          className="w-full border p-3 rounded"
        >
          <option value="WETH">WETH</option>
          <option value="WBTC">WBTC</option>
          <option value="UNI">UNI</option>
        </select>
      </div>

      {/* Agent Policy */}
      <div className="border rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Agent Policy</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(agent.policy, null, 2)}
        </pre>
      </div>

      {/* Plan Step */}
      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold">2. Agent Planning Phase</h2>

        <button
          onClick={runPlan}
          disabled={loadingPlan}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          {loadingPlan ? 'Planning...' : 'Generate Execution Plan'}
        </button>

        {plan && (
          <div className="bg-gray-100 p-4 rounded text-sm">
            <pre>{JSON.stringify(plan, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Execution Step */}
      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold">3. Agent Execution Phase</h2>

        <button
          onClick={runExecution}
          disabled={loadingExec}
          className="bg-green-600 text-white px-6 py-3 rounded-lg"
        >
          {loadingExec ? 'Executing...' : 'Execute with Risk Control'}
        </button>

        {result && (
          <div className="space-y-4">
            <div
              className={`text-xl font-semibold ${result.status === 'completed'
                ? 'text-green-600'
                : 'text-red-600'
                }`}
            >
              Status: {result.status}
            </div>

            {result.txHash && (
              <a
                href={`https://explorer.unichain.org/tx/${result.txHash}`}
                target="_blank"
                className="text-blue-600 underline"
              >
                View Transaction
              </a>
            )}

            {/* Risk Summary */}
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Risk Summary</h3>
              <div>Confidence: {result.risk?.confidence}</div>
              <div>Estimated Latency: {result.risk?.latency}s</div>
              <div>Slippage Risk: {result.risk?.slippage}%</div>
              <div>Decision: {result.risk?.decision}</div>
            </div>

            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(result.risk, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
