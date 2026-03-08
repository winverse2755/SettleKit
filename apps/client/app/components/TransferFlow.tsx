'use client';

import { useState } from 'react';
import { Address } from 'viem';
import { useOrchestrator } from '@/app/hooks/useOrchestrator';
import RiskDashboard from './RiskDashboard';
import TransactionLog from './TransactionLog';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Settings2, Sparkles, Zap, Copy } from 'lucide-react';

interface TransferFlowProps {
    walletAddress: Address | null;
    isConnected: boolean;
}

export default function TransferFlow({ walletAddress, isConnected }: TransferFlowProps) {
    const [amount, setAmount] = useState('5');
    const [useSimulation, setUseSimulation] = useState(true);
    const [agentPolicy, setAgentPolicy] = useState({
        max_slippage: 0.05,
        max_price_impact: 0.10,
        min_confidence: 0.50,
        retry_attempts: 2,
        retry_delay_seconds: 5,
    });

    const {
        executeFlow,
        simulateFlow,
        isRunning,
        result,
        error,
        steps,
        reset,
    } = useOrchestrator();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!walletAddress) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            if (useSimulation) {
                await simulateFlow(amount, walletAddress, agentPolicy);
                toast.success('Simulation completed successfully!');
            } else {
                await executeFlow(amount, walletAddress, agentPolicy);
                toast.success('Cross-chain flow executed successfully!');
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        }
    };

    const handleReset = () => {
        reset();
        toast('Flow reset');
    };

    const handleCopy = (text?: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (!isConnected) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Wallet Not Connected</h3>
                    <p className="text-muted-foreground max-w-md">
                        Connect your wallet to start the cross-chain liquidity provision flow
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Cross-Chain Liquidity Configuration
                    </CardTitle>
                    <CardDescription>
                        Configure your transfer parameters and risk policy
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (USDC)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">💰</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-12"
                                    placeholder="5.0"
                                    disabled={isRunning}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter USDC amount for cross-chain transfer and liquidity provision
                            </p>
                        </div>

                        <Card className="bg-secondary/50 border-border">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">🏊‍♂️</div>
                                    <div>
                                        <h3 className="font-medium">Automatic Pool Selection</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Using pre-configured ETH/USDC pool on Unichain Sepolia
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-secondary/50 border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Agent Risk Policy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="slippage" className="text-xs">Max Slippage (%)</Label>
                                        <Input
                                            id="slippage"
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="50"
                                            value={agentPolicy.max_slippage * 100}
                                            onChange={(e) => setAgentPolicy(prev => ({
                                                ...prev,
                                                max_slippage: parseFloat(e.target.value) / 100
                                            }))}
                                            disabled={isRunning}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Current: {(agentPolicy.max_slippage * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="priceImpact" className="text-xs">Max Price Impact (%)</Label>
                                        <Input
                                            id="priceImpact"
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="50"
                                            value={agentPolicy.max_price_impact * 100}
                                            onChange={(e) => setAgentPolicy(prev => ({
                                                ...prev,
                                                max_price_impact: parseFloat(e.target.value) / 100
                                            }))}
                                            disabled={isRunning}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Current: {(agentPolicy.max_price_impact * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confidence" className="text-xs">Min Confidence (%)</Label>
                                        <Input
                                            id="confidence"
                                            type="number"
                                            step="1"
                                            min="10"
                                            max="100"
                                            value={agentPolicy.min_confidence * 100}
                                            onChange={(e) => setAgentPolicy(prev => ({
                                                ...prev,
                                                min_confidence: parseFloat(e.target.value) / 100
                                            }))}
                                            disabled={isRunning}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Current: {(agentPolicy.min_confidence * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="retryAttempts" className="text-xs">Retry Attempts</Label>
                                        <Input
                                            id="retryAttempts"
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={agentPolicy.retry_attempts}
                                            onChange={(e) => setAgentPolicy(prev => ({
                                                ...prev,
                                                retry_attempts: parseInt(e.target.value)
                                            }))}
                                            disabled={isRunning}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="retryDelay" className="text-xs">Retry Delay (seconds)</Label>
                                        <Input
                                            id="retryDelay"
                                            type="number"
                                            min="1"
                                            max="300"
                                            value={agentPolicy.retry_delay_seconds}
                                            onChange={(e) => setAgentPolicy(prev => ({
                                                ...prev,
                                                retry_delay_seconds: parseInt(e.target.value)
                                            }))}
                                            disabled={isRunning}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                            <div>
                                <h3 className="font-medium">Execution Mode</h3>
                                <p className="text-sm text-muted-foreground">
                                    {useSimulation ? 'Simulation mode for testing' : 'Live mode with real transactions'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm ${useSimulation ? 'text-blue-400' : 'text-muted-foreground'}`}>
                                    Simulation
                                </span>
                                <Switch
                                    checked={!useSimulation}
                                    onCheckedChange={(checked: boolean) => setUseSimulation(!checked)}
                                    disabled={isRunning}
                                />
                                <span className={`text-sm ${!useSimulation ? 'text-green-400' : 'text-muted-foreground'}`}>
                                    Live
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                disabled={isRunning || !walletAddress}
                                className="flex-1 h-12 text-base"
                                variant="default"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {useSimulation ? 'Simulating...' : 'Executing...'}
                                    </>
                                ) : (
                                    <>
                                        {useSimulation ? (
                                            <><Sparkles className="mr-2 h-5 w-5" /> Start Simulation</>
                                        ) : (
                                            <><Zap className="mr-2 h-5 w-5" /> Execute Live Flow</>
                                        )}
                                    </>
                                )}
                            </Button>

                            {(result || error) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    className="px-8"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {steps.length > 0 && (
                <TransactionLog steps={steps} isRunning={isRunning} />
            )}

            {result?.riskMetrics && (
                <RiskDashboard metrics={result.riskMetrics} decision={result.decision} />
            )}

            {result && (
                <Card className="border-border bg-secondary/30">
                    <CardHeader>
                        <CardTitle>Execution Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h3 className="font-medium">Transfer Status</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className="font-medium">
                                            {result.transfer.success ? '✅ Success' : '❌ Failed'}
                                        </span>
                                    </div>
                                    {result.transfer.txHash && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Final TX:</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="font-mono text-xs text-primary">
                                                    {result.transfer.txHash.slice(0, 10)}...{result.transfer.txHash.slice(-8)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleCopy(result?.transfer.txHash)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {result.transfer.amount && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Amount:</span>
                                            <span className="font-medium">{result.transfer.amount} USDC</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-medium">Liquidity Provision</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className="font-medium">
                                            {result.execution.status.toUpperCase()}
                                        </span>
                                    </div>
                                    {result.execution.txHash && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">TX Hash:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-primary">
                                                    {result.execution.txHash.slice(0, 10)}...{result.execution.txHash.slice(-8)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleCopy(result?.execution.txHash)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {result.execution.positionId && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Position ID:</span>
                                            <span className="font-medium">{result.execution.positionId}</span>
                                        </div>
                                    )}
                                    {result.execution.reason && (
                                        <p className="text-sm text-muted-foreground">
                                            Reason: {result.execution.reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-secondary/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Agent Final Decision</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Based on real-time risk assessment
                                    </p>
                                </div>
                                <Badge
                                    variant={
                                        result.decision === 'execute' ? 'default' :
                                            result.decision === 'wait' ? 'secondary' : 'destructive'
                                    }
                                    className="text-base px-4 py-1"
                                >
                                    {result.decision.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && (
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">❌</div>
                            <h3 className="text-xl font-semibold">Execution Error</h3>
                        </div>
                        <div className="bg-destructive/20 p-4 rounded-lg">
                            <p className="font-mono text-sm">{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
