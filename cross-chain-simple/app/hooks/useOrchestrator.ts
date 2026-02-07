'use client';

import { useState, useCallback } from 'react';
import { Address } from 'viem';
import axios from 'axios';

export interface TransferStep {
    step: 'approve' | 'burn' | 'attestation' | 'mint' | 'liquidity';
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    error?: string;
    timestamp: number;
}

export interface RiskMetrics {
    execution_confidence: number;
    slippage_p50: number;
    slippage_p95: number;
    price_impact: number;
    finality_delay_p50: number;
    finality_delay_p95: number;
    capital_at_risk_seconds: number;
    pool_liquidity_depth: string;
    recommended_action: 'execute' | 'wait' | 'abort';
}

export interface OrchestratorResult {
    transfer: {
        success: boolean;
        txHash?: string;
        steps?: TransferStep[];
        amount?: string;
        recipient?: string;
    };
    riskMetrics: RiskMetrics;
    decision: 'execute' | 'wait' | 'abort';
    execution: {
        status: 'completed' | 'failed' | 'aborted';
        txHash?: string;
        positionId?: string;
        reason?: string;
    };
}

export interface AgentPolicy {
    max_slippage?: number;
    max_price_impact?: number;
    min_confidence?: number;
    retry_attempts?: number;
    retry_delay_seconds?: number;
    fallback_strategy?: 'wait' | 'abort';
}

export const useOrchestrator = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<OrchestratorResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [steps, setSteps] = useState<TransferStep[]>([]);

    const executeFlow = useCallback(async (
        amount: string,
        walletAddress: Address,
        agentPolicy?: AgentPolicy
    ) => {
        setIsRunning(true);
        setError(null);
        setSteps([]);
        setResult(null);

        try {
            // Primero, mostrar pasos pendientes
            const initialSteps: TransferStep[] = [
                { step: 'approve', status: 'pending', timestamp: Date.now() },
                { step: 'burn', status: 'pending', timestamp: Date.now() + 100 },
                { step: 'attestation', status: 'pending', timestamp: Date.now() + 200 },
                { step: 'mint', status: 'pending', timestamp: Date.now() + 300 },
                { step: 'liquidity', status: 'pending', timestamp: Date.now() + 400 },
            ];
            setSteps(initialSteps);

            // Enviar solicitud al API route
            const response = await axios.post('/api/orchestrator', {
                amount,
                walletAddress,
                agentPolicy,
            });

            const orchestratorResult = response.data.result;
            setResult(orchestratorResult);

            // Actualizar steps con resultados reales
            if (orchestratorResult.transfer.steps) {
                setSteps(orchestratorResult.transfer.steps);
            }

            return orchestratorResult;
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
            setError(errorMessage);

            // Marcar todos los pasos como fallidos
            setSteps(prev => prev.map(step => ({
                ...step,
                status: 'failed',
                error: errorMessage,
            })));

            throw new Error(errorMessage);
        } finally {
            setIsRunning(false);
        }
    }, []);

    const simulateFlow = useCallback(async (
        amount: string,
        walletAddress: Address,
        agentPolicy?: AgentPolicy
    ) => {
        setIsRunning(true);
        setError(null);
        setSteps([]);
        setResult(null);

        // Crear steps iniciales
        const simulatedSteps: TransferStep[] = [
            {
                step: 'approve',
                status: 'pending',
                timestamp: Date.now(),
            },
            {
                step: 'burn',
                status: 'pending',
                timestamp: Date.now() + 1000,
            },
            {
                step: 'attestation',
                status: 'pending',
                timestamp: Date.now() + 2000,
            },
            {
                step: 'mint',
                status: 'pending',
                timestamp: Date.now() + 3000,
            },
            {
                step: 'liquidity',
                status: 'pending',
                timestamp: Date.now() + 4000,
            },
        ];

        setSteps(simulatedSteps);

        // Simular progreso paso a paso
        const updateStep = (index: number) => {
            setSteps(prev => prev.map((step, i) =>
                i === index
                    ? {
                        ...step,
                        status: 'completed',
                        txHash: `0xsim${Math.random().toString(36).substr(2, 12)}`
                    }
                    : step
            ));
        };

        // Simular cada paso con un delay
        for (let i = 0; i < simulatedSteps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            updateStep(i);
        }

        // Crear resultado simulado
        const simulatedResult: OrchestratorResult = {
            transfer: {
                success: true,
                txHash: '0xsimulated123456',
                steps: simulatedSteps.map((s, i) => ({
                    ...s,
                    status: 'completed',
                    txHash: `0xsim${i}${Math.random().toString(36).substr(2, 10)}`,
                })),
                amount,
                recipient: walletAddress,
            },
            riskMetrics: {
                execution_confidence: 0.92,
                slippage_p50: 0.003,
                slippage_p95: 0.008,
                price_impact: 0.0015,
                finality_delay_p50: 90,
                finality_delay_p95: 240,
                capital_at_risk_seconds: 45,
                pool_liquidity_depth: '1500000',
                recommended_action: 'execute',
            },
            decision: 'execute',
            execution: {
                status: 'completed',
                txHash: '0xsimulated789012',
                positionId: '12345',
            },
        };

        setResult(simulatedResult);
        setIsRunning(false);

        return simulatedResult;
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setResult(null);
        setError(null);
        setSteps([]);
    }, []);

    return {
        executeFlow,
        simulateFlow,
        isRunning,
        result,
        error,
        steps,
        reset,
    };
};