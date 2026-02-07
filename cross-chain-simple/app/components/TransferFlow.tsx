'use client';

import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { useOrchestrator } from '@/app/hooks/useOrchestrator';
import RiskDashboard from './RiskDashboard';
import TransactionLog from './TransactionLog';
import toast from 'react-hot-toast';

interface TransferFlowProps {
    walletAddress: Address | null;
    isConnected: boolean;
}

export default function TransferFlow({ walletAddress, isConnected }: TransferFlowProps) {
    const [amount, setAmount] = useState('5');
    const [useSimulation, setUseSimulation] = useState(true);
    // Eliminamos poolId ya que no se usa más
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

    if (!isConnected) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">🔗</div>
                <h3 className="text-xl font-semibold mb-2">Wallet Not Connected</h3>
                <p className="text-gray-400">
                    Connect your wallet to start the cross-chain liquidity provision flow
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Configuración */}
            <div className="bg-gray-800/50 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-6">Cross-Chain Liquidity Configuration</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Amount (USDC)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 pl-12"
                                placeholder="5.0"
                                disabled={isRunning}
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                💰
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            Enter USDC amount for cross-chain transfer and liquidity provision
                        </p>
                    </div>

                    {/* Info sobre el pool automático */}
                    <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <div className="text-2xl">🏊‍♂️</div>
                            <div>
                                <h3 className="font-medium text-blue-300">Automatic Pool Selection</h3>
                                <p className="text-sm text-gray-400">
                                    Using pre-configured ETH/USDC pool on Unichain Sepolia
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Agent Policy Configuration */}
                    <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4">
                        <h3 className="font-medium text-purple-300 mb-3">Agent Risk Policy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Max Slippage (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="50"
                                    value={agentPolicy.max_slippage * 100}
                                    onChange={(e) => setAgentPolicy(prev => ({
                                        ...prev,
                                        max_slippage: parseFloat(e.target.value) / 100
                                    }))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                    disabled={isRunning}
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                    Current: {(agentPolicy.max_slippage * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Max Price Impact (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="50"
                                    value={agentPolicy.max_price_impact * 100}
                                    onChange={(e) => setAgentPolicy(prev => ({
                                        ...prev,
                                        max_price_impact: parseFloat(e.target.value) / 100
                                    }))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                    disabled={isRunning}
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                    Current: {(agentPolicy.max_price_impact * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Min Confidence (%)</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="10"
                                    max="100"
                                    value={agentPolicy.min_confidence * 100}
                                    onChange={(e) => setAgentPolicy(prev => ({
                                        ...prev,
                                        min_confidence: parseFloat(e.target.value) / 100
                                    }))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                    disabled={isRunning}
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                    Current: {(agentPolicy.min_confidence * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Retry Attempts</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={agentPolicy.retry_attempts}
                                    onChange={(e) => setAgentPolicy(prev => ({
                                        ...prev,
                                        retry_attempts: parseInt(e.target.value)
                                    }))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                    disabled={isRunning}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Retry Delay (seconds)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="300"
                                    value={agentPolicy.retry_delay_seconds}
                                    onChange={(e) => setAgentPolicy(prev => ({
                                        ...prev,
                                        retry_delay_seconds: parseInt(e.target.value)
                                    }))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                    disabled={isRunning}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                        <div>
                            <h3 className="font-medium text-white">Execution Mode</h3>
                            <p className="text-sm text-gray-400">
                                {useSimulation ? 'Simulation mode for testing' : 'Live mode with real transactions'}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className={`text-sm ${useSimulation ? 'text-blue-400' : 'text-gray-400'}`}>
                                Simulation
                            </span>
                            <button
                                type="button"
                                onClick={() => setUseSimulation(!useSimulation)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useSimulation ? 'bg-blue-600' : 'bg-gray-700'
                                    }`}
                                disabled={isRunning}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSimulation ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                            <span className={`text-sm ${!useSimulation ? 'text-green-400' : 'text-gray-400'}`}>
                                Live
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            disabled={isRunning || !walletAddress}
                            className={`flex-1 py-3 rounded-lg font-bold text-lg transition-all relative overflow-hidden ${isRunning
                                    ? 'bg-gray-700 cursor-not-allowed'
                                    : useSimulation
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                }`}
                        >
                            {isRunning ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    {useSimulation ? 'Simulating...' : 'Executing...'}
                                </span>
                            ) : (
                                <span>
                                    {useSimulation ? '🚀 Start Simulation' : '⚡ Execute Live Flow'}
                                </span>
                            )}
                        </button>

                        {(result || error) && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Transaction Log */}
            {steps.length > 0 && (
                <TransactionLog steps={steps} isRunning={isRunning} />
            )}

            {/* Risk Dashboard */}
            {result?.riskMetrics && (
                <RiskDashboard metrics={result.riskMetrics} decision={result.decision} />
            )}

            {/* Results */}
            {result && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Execution Results</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="font-medium text-white">Transfer Status</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className={`font-medium ${result.transfer.success ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {result.transfer.success ? '✅ Success' : '❌ Failed'}
                                    </span>
                                </div>
                                {result.transfer.txHash && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Final TX:</span>
                                        <span className="font-mono text-sm text-blue-400">
                                            {result.transfer.txHash.slice(0, 10)}...{result.transfer.txHash.slice(-8)}
                                        </span>
                                    </div>
                                )}
                                {result.transfer.amount && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Amount:</span>
                                        <span className="font-medium">{result.transfer.amount} USDC</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-medium text-white">Liquidity Provision</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className={`font-medium ${result.execution.status === 'completed' ? 'text-green-400' :
                                            result.execution.status === 'aborted' ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {result.execution.status.toUpperCase()}
                                    </span>
                                </div>
                                {result.execution.txHash && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">TX Hash:</span>
                                        <span className="font-mono text-sm text-blue-400">
                                            {result.execution.txHash.slice(0, 10)}...{result.execution.txHash.slice(-8)}
                                        </span>
                                    </div>
                                )}
                                {result.execution.positionId && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Position ID:</span>
                                        <span className="font-medium">{result.execution.positionId}</span>
                                    </div>
                                )}
                                {result.execution.reason && (
                                    <div className="text-sm text-gray-400">
                                        Reason: {result.execution.reason}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Agent Decision */}
                    <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-gray-900 to-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-white">Agent Final Decision</h4>
                                <p className="text-sm text-gray-400">
                                    Based on real-time risk assessment
                                </p>
                            </div>
                            <div className={`px-4 py-2 rounded-full font-bold ${result.decision === 'execute' ? 'bg-green-900/50 text-green-400' :
                                    result.decision === 'wait' ? 'bg-yellow-900/50 text-yellow-400' :
                                        'bg-red-900/50 text-red-400'
                                }`}>
                                {result.decision.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="text-2xl">❌</div>
                        <h3 className="text-xl font-semibold text-red-400">Execution Error</h3>
                    </div>
                    <div className="bg-red-900/30 p-4 rounded-lg">
                        <p className="text-red-300 font-mono text-sm">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}