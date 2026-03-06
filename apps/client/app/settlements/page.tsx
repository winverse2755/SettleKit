'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { SettlementStatusBadge } from '../components/SettlementStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, List, Activity, Loader2 } from 'lucide-react';
import { formatAmount, getTenderlyTxUrl } from '@/lib/utils';

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

interface Settlement {
  id: string;
  intent: SettlementIntent;
  status: string;
  riskReport?: { explorerUrl?: string };
  txHash?: string;
  explorerUrl?: string;
  createdAt: number;
  updatedAt: number;
}

interface PositionWithMonitoring {
  positionId: string;
  poolAddress: string;
  depositAmount: string;
  chain: string;
  latestMonitoringStatus?: string;
  latestLiquidity?: string;
  lastScanAt?: number;
}

async function fetchSettlements(): Promise<Settlement[]> {
  const res = await fetch('/api/backend/settlements');
  const data = await res.json();
  if (!res.ok) {
    const hint = data?.hint || 'Ensure skit-backend is running on port 3001 or your ngrok tunnel is active.';
    throw new Error(`Backend unavailable. ${hint}`);
  }
  if (Array.isArray(data)) return data;
  if (data?.settlements && Array.isArray(data.settlements)) return data.settlements;
  return [];
}

async function fetchPositions(): Promise<PositionWithMonitoring[]> {
  const res = await fetch('/api/backend/positions');
  const data = await res.json();
  if (!res.ok) {
    const hint = data?.hint || 'Ensure skit-backend is running on port 3001 or your ngrok tunnel is active.';
    throw new Error(`Backend unavailable. ${hint}`);
  }
  if (Array.isArray(data)) return data;
  if (data?.positions && Array.isArray(data.positions)) return data.positions;
  return [];
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

function truncateId(id: string) {
  if (id.match(/^stl-\d+$/)) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState<'settlements' | 'positions'>('settlements');

  const settlementsQuery = useQuery({
    queryKey: ['settlements'],
    queryFn: fetchSettlements,
    refetchInterval: (query) => (query.state.error ? 60_000 : 10_000),
  });

  const positionsQuery = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: (query) => (query.state.error ? 60_000 : 10_000),
    enabled: activeTab === 'positions',
  });

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Risk Report & Monitoring</h1>
        <p className="text-muted-foreground">
          Settlement simulations and position monitoring from the Telegram bot
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'settlements' ? 'default' : 'outline'}
          onClick={() => setActiveTab('settlements')}
        >
          <List className="mr-2 h-4 w-4" />
          Settlements
        </Button>
        <Button
          variant={activeTab === 'positions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('positions')}
        >
          <Activity className="mr-2 h-4 w-4" />
          Monitor Status
        </Button>
      </div>

      {activeTab === 'settlements' && (
        <Card>
          <CardHeader>
            <CardTitle>Settlement List</CardTitle>
            <p className="text-sm text-muted-foreground">
              Status badges: APPROVED, WARNING, BLOCKED, PENDING, EXECUTED, FAILED
            </p>
          </CardHeader>
          <CardContent>
            {settlementsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : settlementsQuery.error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>{String(settlementsQuery.error)}</p>
                <p className="text-sm mt-2">
                  Run <code className="bg-muted px-1 rounded">npm run dev:all</code> from the repo root to start both backend and client.
                </p>
              </div>
            ) : !Array.isArray(settlementsQuery.data) || !settlementsQuery.data.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <List className="h-12 w-12 mb-4 opacity-50" />
                <p>No settlements yet</p>
                <p className="text-sm mt-2">Submit a simulation via the Telegram bot to see results here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlementsQuery.data.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/settlements/${s.id}`}
                          className="font-mono text-sm font-medium hover:underline truncate"
                        >
                          {truncateId(s.id)}
                        </Link>
                        <SettlementStatusBadge status={s.status as any} />
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {s.intent.sourceChain} → {s.intent.targetChain} • {formatAmount(s.intent.amount)} {s.intent.token}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(s.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/settlements/${s.id}`}>View</Link>
                      </Button>
                      {(s.txHash || s.riskReport?.explorerUrl || s.explorerUrl) && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={s.txHash ? getTenderlyTxUrl(s.txHash) : (s.riskReport?.explorerUrl || s.explorerUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'positions' && (
        <Card>
          <CardHeader>
            <CardTitle>Position Monitoring</CardTitle>
            <p className="text-sm text-muted-foreground">
              Active positions with monitoring status from the Telegram bot
            </p>
          </CardHeader>
          <CardContent>
            {positionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : positionsQuery.error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>{String(positionsQuery.error)}</p>
                <p className="text-sm mt-2">
                  Run <code className="bg-muted px-1 rounded">npm run dev:all</code> from the repo root to start both backend and client.
                </p>
              </div>
            ) : !Array.isArray(positionsQuery.data) || !positionsQuery.data.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-50" />
                <p>No active positions</p>
                <p className="text-sm mt-2">Positions will appear here after settlements are executed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {positionsQuery.data.map((p) => (
                  <div
                    key={p.positionId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-medium truncate">
                          {truncateId(p.positionId)}
                        </span>
                        {p.latestMonitoringStatus && (
                          <SettlementStatusBadge
                            status={p.latestMonitoringStatus as 'HEALTHY' | 'MOVE_RECOMMENDED'}
                          />
                        )}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Pool: {p.poolAddress.slice(0, 10)}...{p.poolAddress.slice(-8)} • {p.chain}
                      </div>
                      <div className="text-sm mt-1">
                        Deposit: {formatAmount(p.depositAmount)} • Liquidity: {p.latestLiquidity != null ? formatAmount(p.latestLiquidity) : '—'}
                      </div>
                      {p.lastScanAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Last scan: {formatTimestamp(p.lastScanAt)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
