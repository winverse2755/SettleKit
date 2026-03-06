'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SettlementStatusBadge } from '../../components/SettlementStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowLeft, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { formatAmount } from '@/lib/utils';

interface SettlementIntent {
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: string;
  maxSlippageTolerance: number;
  maxBridgeDelay: number;
  sourceRpc: string;
  targetRpc: string;
}

interface RiskCheck {
  name: string;
  passed: boolean;
  actual: string | number;
  threshold: string | number;
  severity: string;
  description?: string;
}

interface OracleDataReport {
  ethUsdPrice: string;
  usdcUsdPrice: string;
  timestamp: number;
}

interface TenderlySim {
  success: boolean;
  gasEstimate: string;
  expectedOutput: string;
  vnetId?: string;
  txHash?: string;
}

interface RiskReport {
  status: string;
  checks: RiskCheck[];
  oracleData: OracleDataReport;
  tenderlySim: TenderlySim;
  explorerUrl: string;
  recipeId: string;
  timestamp: number;
  intent: SettlementIntent;
  selectedPoolId?: string;
}

interface Settlement {
  id: string;
  intent: SettlementIntent;
  status: string;
  riskReport?: RiskReport;
  execution?: { txHash: string; explorerUrl: string };
  txHash?: string;
  explorerUrl?: string;
  createdAt: number;
  updatedAt: number;
}

async function fetchSettlement(id: string): Promise<Settlement> {
  const res = await fetch(`/api/backend/settlement/${id}`);
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 404) throw new Error('Settlement not found');
    const hint = data?.hint || 'Ensure skit-backend is running on port 3001 or your ngrok tunnel is active.';
    throw new Error(`Backend unavailable. ${hint}`);
  }
  return data;
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function SettlementDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: settlement, isLoading, error } = useQuery({
    queryKey: ['settlement', id],
    queryFn: () => fetchSettlement(id),
    enabled: !!id,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex items-center justify-center py-24">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <p>{error ? String(error) : 'Settlement not found'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/settlements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settlements
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const report = settlement.riskReport;
  const explorerUrl = report?.explorerUrl || settlement.explorerUrl;
  const txHash = settlement.execution?.txHash || settlement.txHash;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/settlements">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settlements
        </Link>
      </Button>

      <div className="mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold font-mono">{settlement.id}</h1>
          <SettlementStatusBadge status={settlement.status as any} className="text-base px-4 py-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copyToClipboard(window.location.href)}
            title="Copy shareable link"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Created: {formatTimestamp(settlement.createdAt)} • Updated: {formatTimestamp(settlement.updatedAt)}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recipe Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Settlement intent and parameters</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Source Chain</div>
                <div className="font-medium">{settlement.intent.sourceChain}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Target Chain</div>
                <div className="font-medium">{settlement.intent.targetChain}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Token</div>
                <div className="font-medium">{settlement.intent.token}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-medium">{formatAmount(settlement.intent.amount)} {settlement.intent.token}</div>
              </div>
              {settlement.riskReport?.selectedPoolId && (
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground">Selected Pool (ID)</div>
                  <div className="font-mono text-sm break-all">{settlement.riskReport.selectedPoolId}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Max Slippage Tolerance</div>
                <div className="font-medium">{(settlement.intent.maxSlippageTolerance * 100).toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Bridge Delay</div>
                <div className="font-medium">{settlement.intent.maxBridgeDelay}ms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Oracle Prices</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Prices used at {formatTimestamp(report.oracleData.timestamp)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">ETH/USD</div>
                    <div className="text-xl font-semibold">${report.oracleData.ethUsdPrice}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">USDC/USD</div>
                    <div className="text-xl font-semibold">${report.oracleData.usdcUsdPrice}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Check Results</CardTitle>
                <p className="text-sm text-muted-foreground">CRE workflow risk assessment</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.checks.map((check, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        check.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {check.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <div className="font-medium capitalize">{check.name}</div>
                          {check.description && (
                            <div className="text-sm text-muted-foreground">{check.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          Actual: <span className="font-mono">{String(check.actual)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Threshold: <span className="font-mono">{String(check.threshold)}</span>
                        </div>
                        <div className="text-xs mt-1 capitalize">{check.severity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenderly Simulation</CardTitle>
                <p className="text-sm text-muted-foreground">CRE workflow trace</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={report.tenderlySim.success ? 'text-emerald-500' : 'text-destructive'}>
                    {report.tenderlySim.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Gas Estimate</div>
                    <div className="font-mono">{report.tenderlySim.gasEstimate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Expected Output</div>
                    <div className="font-mono text-sm break-all">{formatAmount(report.tenderlySim.expectedOutput)}</div>
                  </div>
                </div>
                {explorerUrl && (
                  <Button asChild>
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Tenderly Explorer
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {(txHash || settlement.execution) && (
          <Card>
            <CardHeader>
              <CardTitle>Execution Result</CardTitle>
              <p className="text-sm text-muted-foreground">Transaction details</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Transaction Hash</div>
                  <div className="font-mono text-sm break-all">{txHash}</div>
                </div>
                {(settlement.execution?.explorerUrl || settlement.explorerUrl) && (
                  <Button asChild>
                    <a
                      href={settlement.execution?.explorerUrl || settlement.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Explorer
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
