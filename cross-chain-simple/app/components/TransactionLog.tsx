'use client';

import { TransferStep } from '@/app/hooks/useOrchestrator';
import { useState } from 'react';

interface TransactionLogProps {
    steps: TransferStep[];
    isRunning: boolean;
}

export default function TransactionLog({ steps, isRunning }: TransactionLogProps) {
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    const getStepIcon = (step: TransferStep) => {
        switch (step.status) {
            case 'completed':
                return (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case 'failed':
                return (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                );
            case 'pending':
                return isRunning ? (
                    <div className="w-8 h-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-400 bg-green-900/30';
            case 'failed': return 'text-red-400 bg-red-900/30';
            case 'pending': return 'text-blue-400 bg-blue-900/30';
            default: return 'text-gray-400 bg-gray-900/30';
        }
    };

    const getStepColor = (step: string) => {
        switch (step) {
            case 'approve': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'burn': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'attestation': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'mint': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'liquidity': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const toggleExpand = (stepId: string) => {
        setExpandedStep(expandedStep === stepId ? null : stepId);
    };

    // Ordenar pasos por timestamp (más antiguo primero)
    const sortedSteps = [...steps].sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Transaction Log</h2>
                <div className="text-sm text-gray-400">
                    {steps.filter(s => s.status === 'completed').length} of {steps.length} steps completed
                </div>
            </div>

            {steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No transactions started</p>
                    <p className="text-sm mt-2">Begin the flow to see transaction updates</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Timeline visualization */}
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>

                        {/* Steps */}
                        <div className="space-y-6">
                            {sortedSteps.map((step, index) => {
                                const stepId = `${step.step}-${step.timestamp}`;
                                const isExpanded = expandedStep === stepId;

                                return (
                                    <div key={stepId} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute left-4 transform -translate-x-1/2 z-10">
                                            {getStepIcon(step)}
                                        </div>

                                        {/* Step card */}
                                        <div className={`ml-12 rounded-lg transition-all ${step.status === 'failed'
                                                ? 'bg-red-900/20 border border-red-800/50'
                                                : step.status === 'completed'
                                                    ? 'bg-green-900/10 border border-green-800/30'
                                                    : 'bg-gray-900/30 border border-gray-700'
                                            }`}>
                                            {/* Step header */}
                                            <button
                                                onClick={() => toggleExpand(stepId)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors rounded-lg"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-left">
                                                        <h3 className="font-medium text-white">
                                                            {getStepDescription(step)}
                                                        </h3>
                                                        <div className="flex items-center space-x-3 mt-1">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${getStepColor(step.step)}`}>
                                                                {step.step.charAt(0).toUpperCase() + step.step.slice(1)}
                                                            </span>
                                                            <span className={`text-xs font-medium ${getStatusColor(step.status)} px-2 py-1 rounded-full`}>
                                                                {getStatusText(step.status)}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {getTimeElapsed(step.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                    <span className="text-sm text-gray-400">
                                                        {getChainForStep(step)}
                                                    </span>
                                                    <svg
                                                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </button>

                                            {/* Expanded content */}
                                            {isExpanded && (
                                                <div className="p-4 pt-0 border-t border-gray-800/50 mt-2">
                                                    <div className="space-y-4">
                                                        {/* Transaction Hash */}
                                                        {step.txHash && (
                                                            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                                                                <div>
                                                                    <div className="text-sm text-gray-400 mb-1">Transaction Hash</div>
                                                                    <div className="font-mono text-sm text-white">
                                                                        {formatTxHash(step.txHash)}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(step.txHash!)}
                                                                    className="p-2 hover:bg-gray-800 rounded-md transition-colors"
                                                                    title="Copy hash"
                                                                >
                                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Chain Info */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-3 bg-gray-900/50 rounded-lg">
                                                                <div className="text-sm text-gray-400 mb-1">Chain</div>
                                                                <div className="font-medium text-white">
                                                                    {getChainForStep(step)}
                                                                </div>
                                                            </div>
                                                            <div className="p-3 bg-gray-900/50 rounded-lg">
                                                                <div className="text-sm text-gray-400 mb-1">Timestamp</div>
                                                                <div className="font-medium text-white">
                                                                    {formatTime(step.timestamp)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Error details */}
                                                        {step.error && (
                                                            <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                                                                <div className="flex items-center space-x-2 mb-2">
                                                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <div className="text-sm font-medium text-red-400">Error Details</div>
                                                                </div>
                                                                <div className="text-sm text-red-300 font-mono bg-red-900/30 p-2 rounded">
                                                                    {step.error}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Explorer link */}
                                                        {step.txHash && (
                                                            <a
                                                                href={`https://sepolia.basescan.org/tx/${step.txHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center space-x-2 p-3 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/50 rounded-lg transition-colors"
                                                            >
                                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                                <span className="text-sm text-blue-400">View on Explorer</span>
                                                            </a>
                                                        )}
                                                    </div>
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

            {/* Progress summary */}
            {steps.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-white">Progress Summary</h3>
                        <div className="text-sm text-gray-400">
                            {steps.filter(s => s.status === 'completed').length}/{steps.length}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{
                                width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%`,
                            }}
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-green-500">
                                {steps.filter(s => s.status === 'completed').length}
                            </div>
                            <div className="text-sm text-gray-400">Completed</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-500">
                                {steps.filter(s => s.status === 'pending').length}
                            </div>
                            <div className="text-sm text-gray-400">Pending</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-500">
                                {steps.filter(s => s.status === 'failed').length}
                            </div>
                            <div className="text-sm text-gray-400">Failed</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}