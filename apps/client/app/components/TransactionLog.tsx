'use client';

import { TransferStep } from '@/app/hooks/useOrchestrator';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransactionLogProps {
    steps: TransferStep[];
    isRunning: boolean;
}

export default function TransactionLog({ steps, isRunning }: TransactionLogProps) {
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    const getStepIcon = (step: TransferStep) => {
        switch (step.status) {
            case 'completed':
                return <CheckCircle2 className="h-8 w-8" />;
            case 'failed':
                return <XCircle className="h-8 w-8" />;
            case 'pending':
                return isRunning ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                    <div className="h-8 w-8 rounded-full border-2 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-foreground" />
                    </div>
                );
        }
    };

    const getStepDescription = (step: TransferStep) => {
        const descriptions: Record<string, string> = {
            'approve': 'Approve USDC spending on Base',
            'burn': 'Burn USDC via CCTP (Base → Arc)',
            'attestation': 'Circle attestation',
            'mint': 'Mint USDC on destination',
            'liquidity': 'Add liquidity to Uniswap v4 pool',
        };
        return descriptions[step.step] || step.step;
    };

    const getChainForStep = (step: TransferStep) => {
        const chains: Record<string, string> = {
            'approve': 'Base Sepolia',
            'burn': 'Base → Arc',
            'attestation': 'Circle Network',
            'mint': 'Unichain Sepolia',
            'liquidity': 'Unichain Sepolia',
        };
        return chains[step.step] || 'Unknown Chain';
    };

    const getTimeElapsed = (timestamp: number) => {
        const now = Date.now();
        const elapsed = now - timestamp;

        if (elapsed < 60000) {
            return `${Math.floor(elapsed / 1000)}s ago`;
        } else if (elapsed < 3600000) {
            return `${Math.floor(elapsed / 60000)}m ago`;
        } else {
            return `${Math.floor(elapsed / 3600000)}h ago`;
        }
    };

    const formatTxHash = (hash?: string) => {
        if (!hash) return 'Pending...';
        return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'Completed';
            case 'failed': return 'Failed';
            case 'pending': return 'In Progress';
            default: return 'Pending';
        }
    };

    const getStepColor = (step: string) => {
        return 'bg-secondary text-foreground border-border';
    };

    const toggleExpand = (stepId: string) => {
        setExpandedStep(expandedStep === stepId ? null : stepId);
    };

    const sortedSteps = [...steps].sort((a, b) => a.timestamp - b.timestamp);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Transaction Log</CardTitle>
                    <div className="text-sm text-muted-foreground">
                        {steps.filter(s => s.status === 'completed').length} of {steps.length} steps completed
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {steps.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions started</p>
                        <p className="text-sm mt-2">Begin the flow to see transaction updates</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

                            <div className="space-y-6">
                                {sortedSteps.map((step) => {
                                    const stepId = `${step.step}-${step.timestamp}`;
                                    const isExpanded = expandedStep === stepId;

                                    return (
                                        <div key={stepId} className="relative">
                                            <div className="absolute left-4 transform -translate-x-1/2 z-10">
                                                {getStepIcon(step)}
                                            </div>

                                            <div className={`ml-12 rounded-lg border transition-all ${
                                                step.status === 'failed' ? 'border-destructive/50 bg-destructive/10' :
                                                step.status === 'completed' ? 'border-border bg-card' :
                                                'border-border bg-card/50'
                                            }`}>
                                                <button
                                                    onClick={() => toggleExpand(stepId)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-lg"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-left">
                                                            <h3 className="font-medium">{getStepDescription(step)}</h3>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs ${getStepColor(step.step)}`}
                                                                >
                                                                    {step.step.charAt(0).toUpperCase() + step.step.slice(1)}
                                                                </Badge>
                                                                <Badge
                                                                    variant={
                                                                        step.status === 'completed' ? 'default' :
                                                                        step.status === 'failed' ? 'destructive' : 'secondary'
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {getStatusText(step.status)}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {getTimeElapsed(step.timestamp)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-muted-foreground hidden md:block">
                                                            {getChainForStep(step)}
                                                        </span>
                                                        <ChevronDown
                                                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                                                                isExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        />
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className="p-4 pt-0 border-t border-border/50 mt-2 space-y-4">
                                                        {step.txHash && (
                                                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                                <div>
                                                                    <div className="text-sm text-muted-foreground mb-1">Transaction Hash</div>
                                                                    <div className="font-mono text-sm">{formatTxHash(step.txHash)}</div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => navigator.clipboard.writeText(step.txHash!)}
                                                                >
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                                <div className="text-sm text-muted-foreground mb-1">Chain</div>
                                                                <div className="font-medium">{getChainForStep(step)}</div>
                                                            </div>
                                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                                <div className="text-sm text-muted-foreground mb-1">Timestamp</div>
                                                                <div className="font-medium">{formatTime(step.timestamp)}</div>
                                                            </div>
                                                        </div>

                                                        {step.error && (
                                                            <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <XCircle className="h-4 w-4" />
                                                                    <div className="text-sm font-medium">Error Details</div>
                                                                </div>
                                                                <div className="text-sm font-mono bg-destructive/20 p-2 rounded">
                                                                    {step.error}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.txHash && (
                                                            <Button
                                                                variant="outline"
                                                                className="w-full"
                                                                asChild
                                                            >
                                                                <a
                                                                    href={`https://sepolia.basescan.org/tx/${step.txHash}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    View on Explorer
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {steps.length > 0 && (
                    <div className="mt-8 pt-6 border-t space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Progress Summary</h3>
                            <div className="text-sm text-muted-foreground">
                                {steps.filter(s => s.status === 'completed').length}/{steps.length}
                            </div>
                        </div>

                        <Progress
                            value={(steps.filter(s => s.status === 'completed').length / steps.length) * 100}
                            className="h-2"
                        />

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold">
                                    {steps.filter(s => s.status === 'completed').length}
                                </div>
                                <div className="text-sm text-muted-foreground">Completed</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {steps.filter(s => s.status === 'pending').length}
                                </div>
                                <div className="text-sm text-muted-foreground">Pending</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {steps.filter(s => s.status === 'failed').length}
                                </div>
                                <div className="text-sm text-muted-foreground">Failed</div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
