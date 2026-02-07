'use client';

import { RiskMetrics } from '@/app/hooks/useOrchestrator';

interface RiskDashboardProps {
    metrics: RiskMetrics;
    decision: 'execute' | 'wait' | 'abort';
}

export default function RiskDashboard({ metrics, decision }: RiskDashboardProps) {
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-400';
        if (confidence >= 0.6) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getConfidenceBar = (confidence: number) => {
        const width = confidence * 100;
        let color = '';
        if (confidence >= 0.8) color = 'bg-gradient-to-r from-green-500 to-emerald-500';
        else if (confidence >= 0.6) color = 'bg-gradient-to-r from-yellow-500 to-amber-500';
        else color = 'bg-gradient-to-r from-red-500 to-pink-500';

        return { width, color };
    };

    const getSlippageColor = (slippage: number) => {
        if (slippage <= 0.01) return 'text-green-400';
        if (slippage <= 0.05) return 'text-yellow-400';
        return 'text-red-400';
    };

    const bar = getConfidenceBar(metrics.execution_confidence);

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Risk Assessment Dashboard</h2>
                <div className={`px-4 py-2 rounded-full font-bold ${decision === 'execute' ? 'bg-green-900/50 text-green-400' :
                        decision === 'wait' ? 'bg-yellow-900/50 text-yellow-400' :
                            'bg-red-900/50 text-red-400'
                    }`}>
                    {decision.toUpperCase()}
                </div>
            </div>

            <div className="space-y-6">
                {/* Execution Confidence */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Execution Confidence</span>
                        <span className={`text-lg font-semibold ${getConfidenceColor(metrics.execution_confidence)}`}>
                            {(metrics.execution_confidence * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                            style={{ width: `${bar.width}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low Risk</span>
                        <span>High Risk</span>
                    </div>
                </div>

                {/* Slippage Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/30 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Slippage P50</div>
                        <div className={`text-xl font-semibold ${getSlippageColor(metrics.slippage_p50)}`}>
                            {(metrics.slippage_p50 * 100).toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">Median Case</div>
                    </div>
                    <div className="bg-gray-900/30 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Slippage P95</div>
                        <div className={`text-xl font-semibold ${getSlippageColor(metrics.slippage_p95)}`}>
                            {(metrics.slippage_p95 * 100).toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">Worst Case</div>
                    </div>
                </div>

                {/* Price Impact */}
                <div className="bg-gray-900/30 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Price Impact</span>
                        <span className="text-lg font-semibold text-white">
                            {(metrics.price_impact * 100).toFixed(2)}%
                        </span>
                    </div>
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${metrics.price_impact <= 0.02
                                    ? 'bg-green-500'
                                    : metrics.price_impact <= 0.05
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                }`}
                            style={{ width: `${Math.min(metrics.price_impact * 10 * 100, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Finality Delays */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/30 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Avg Finality Delay</div>
                        <div className="text-xl font-semibold text-white">
                            {metrics.finality_delay_p50.toFixed(1)}s
                        </div>
                        <div className="text-xs text-gray-500">P50</div>
                    </div>
                    <div className="bg-gray-900/30 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Worst Finality Delay</div>
                        <div className="text-xl font-semibold text-orange-400">
                            {metrics.finality_delay_p95.toFixed(1)}s
                        </div>
                        <div className="text-xs text-gray-500">P95</div>
                    </div>
                </div>

                {/* Pool Info */}
                <div className="bg-gray-900/30 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Pool Liquidity Depth</div>
                            <div className="text-lg font-semibold text-white">
                                ${parseInt(metrics.pool_liquidity_depth).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Capital at Risk</div>
                            <div className="text-lg font-semibold text-amber-400">
                                {metrics.capital_at_risk_seconds}s
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommended Action */}
                <div className={`p-4 rounded-lg border ${metrics.recommended_action === 'execute'
                        ? 'border-green-800/50 bg-green-900/10'
                        : metrics.recommended_action === 'wait'
                            ? 'border-yellow-800/50 bg-yellow-900/10'
                            : 'border-red-800/50 bg-red-900/10'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                                {metrics.recommended_action === 'execute' ? '✅' :
                                    metrics.recommended_action === 'wait' ? '⏳' : '❌'}
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">Recommended Action</div>
                                <div className="text-lg font-semibold text-white capitalize">
                                    {metrics.recommended_action}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400">
                            Based on real-time analysis
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}