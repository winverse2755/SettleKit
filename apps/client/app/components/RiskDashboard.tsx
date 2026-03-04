'use client';

import { RiskMetrics } from '@/app/hooks/useOrchestrator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Clock, Droplets, Shield } from 'lucide-react';

interface RiskDashboardProps {
    metrics: RiskMetrics;
    decision: 'execute' | 'wait' | 'abort';
}

export default function RiskDashboard({ metrics, decision }: RiskDashboardProps) {
    const getConfidenceColor = (confidence: number) => {
        return 'text-foreground';
    };

    const getSlippageColor = (slippage: number) => {
        return 'text-foreground';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Risk Assessment Dashboard
                    </CardTitle>
                    <Badge
                        variant={
                            decision === 'execute' ? 'default' :
                            decision === 'wait' ? 'secondary' : 'destructive'
                        }
                        className="text-base px-4 py-1"
                    >
                        {decision.toUpperCase()}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Execution Confidence
                        </span>
                        <span className={`text-lg font-semibold ${getConfidenceColor(metrics.execution_confidence)}`}>
                            {(metrics.execution_confidence * 100).toFixed(1)}%
                        </span>
                    </div>
                    <Progress value={metrics.execution_confidence * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low Risk</span>
                        <span>High Risk</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-muted/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <TrendingDown className="h-4 w-4" />
                                Slippage P50
                            </div>
                            <div className={`text-2xl font-semibold ${getSlippageColor(metrics.slippage_p50)}`}>
                                {(metrics.slippage_p50 * 100).toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Median Case</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <TrendingUp className="h-4 w-4" />
                                Slippage P95
                            </div>
                            <div className={`text-2xl font-semibold ${getSlippageColor(metrics.slippage_p95)}`}>
                                {(metrics.slippage_p95 * 100).toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Worst Case</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Price Impact
                            </span>
                            <span className="text-lg font-semibold">
                                {(metrics.price_impact * 100).toFixed(2)}%
                            </span>
                        </div>
                        <Progress
                            value={Math.min(metrics.price_impact * 10 * 100, 100)}
                            className="h-1"
                        />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-muted/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Clock className="h-4 w-4" />
                                Avg Finality Delay
                            </div>
                            <div className="text-2xl font-semibold">
                                {metrics.finality_delay_p50.toFixed(1)}s
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">P50</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Clock className="h-4 w-4" />
                                Worst Finality Delay
                            </div>
                            <div className="text-2xl font-semibold">
                                {metrics.finality_delay_p95.toFixed(1)}s
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">P95</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                        <div className="flex justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <Droplets className="h-4 w-4" />
                                    Pool Liquidity Depth
                                </div>
                                <div className="text-lg font-semibold">
                                    ${parseInt(metrics.pool_liquidity_depth).toLocaleString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground mb-1">Capital at Risk</div>
                                <div className="text-lg font-semibold">
                                    {metrics.capital_at_risk_seconds}s
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-secondary/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">
                                    {metrics.recommended_action === 'execute' ? '✅' :
                                     metrics.recommended_action === 'wait' ? '⏳' : '❌'}
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Recommended Action</div>
                                    <div className="text-lg font-semibold capitalize">
                                        {metrics.recommended_action}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Based on real-time analysis
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
}
