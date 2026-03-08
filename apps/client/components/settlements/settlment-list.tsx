"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  List,
  Activity,
  Loader2,
  FileX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettlementRow, type SettlementRowData } from "./settlement-row";
import { StatusBadge, StatusLegend } from "./status-badge";
import { fadeUp } from "@/lib/animations";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface SettlementIntent {
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: string;
  maxSlippageTolerance: number;
  maxBridgeDelay: number;
  sourceRpc: string;
  targetRpc: string;
}

export interface Settlement {
  id: string;
  intent: SettlementIntent;
  status: string;
  riskReport?: { explorerUrl?: string };
  txHash?: string;
  explorerUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PositionWithMonitoring {
  positionId: string;
  poolAddress: string;
  depositAmount: string;
  chain: string;
  latestMonitoringStatus?: string;
  latestLiquidity?: string;
  lastScanAt?: number;
}

async function fetchSettlements(): Promise<Settlement[]> {
  const res = await fetch("/api/backend/settlements");
  const data = await res.json();
  if (!res.ok) {
    const hint =
      data?.hint ||
      "Ensure skit-backend is running on port 3001 or your ngrok tunnel is active.";
    throw new Error(`Backend unavailable. ${hint}`);
  }
  if (Array.isArray(data)) return data;
  if (data?.settlements && Array.isArray(data.settlements))
    return data.settlements;
  return [];
}

async function fetchPositions(): Promise<PositionWithMonitoring[]> {
  const res = await fetch("/api/backend/positions");
  const data = await res.json();
  if (!res.ok) {
    const hint =
      data?.hint ||
      "Ensure skit-backend is running on port 3001 or your ngrok tunnel is active.";
    throw new Error(`Backend unavailable. ${hint}`);
  }
  if (Array.isArray(data)) return data;
  if (data?.positions && Array.isArray(data.positions)) return data.positions;
  return [];
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

const PAGE_SIZE = 10;

function toRowData(s: Settlement): SettlementRowData {
  return {
    id: s.id,
    status: s.status,
    sourceChain: s.intent.sourceChain,
    targetChain: s.intent.targetChain,
    token: s.intent.token,
    amount: s.intent.amount,
    createdAt: s.createdAt,
    txHash: s.txHash,
    riskReport: s.riskReport,
    explorerUrl: s.explorerUrl,
  };
}

export function SettlementList() {
  const [settlementsPage, setSettlementsPage] = React.useState(1);
  const [positionsPage, setPositionsPage] = React.useState(1);

  const settlementsQuery = useQuery({
    queryKey: ["settlements"],
    queryFn: fetchSettlements,
    refetchInterval: (query) => (query.state.error ? 60_000 : 10_000),
  });

  const positionsQuery = useQuery({
    queryKey: ["positions"],
    queryFn: fetchPositions,
    refetchInterval: (query) => (query.state.error ? 60_000 : 10_000),
  });

  const settlements = settlementsQuery.data ?? [];
  const positions = positionsQuery.data ?? [];
  const totalSettlements = settlements.length;
  const totalPositions = positions.length;
  const totalSettlementPages = Math.ceil(totalSettlements / PAGE_SIZE) || 1;
  const totalPositionPages = Math.ceil(totalPositions / PAGE_SIZE) || 1;
  const paginatedSettlements = settlements.slice(
    (settlementsPage - 1) * PAGE_SIZE,
    settlementsPage * PAGE_SIZE,
  );
  const paginatedPositions = positions.slice(
    (positionsPage - 1) * PAGE_SIZE,
    positionsPage * PAGE_SIZE,
  );

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12">
      <motion.div
        className="mb-8"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-[32px] font-bold text-foreground mb-2">
          Risk Report & Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">
          Settlement simulations and position monitoring from the Telegram bot
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-6"
      >
        <Tabs defaultValue="settlements" className="w-full">
          <TabsList className="w-full sm:w-auto bg-[rgba(21,18,40,0.3)] rounded-lg p-1">
            <TabsTrigger value="settlements" className="gap-2">
              <List className="h-4 w-4" />
              Settlements
            </TabsTrigger>
            <TabsTrigger value="positions" className="gap-2">
              <Activity className="h-4 w-4" />
              Monitor Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settlements" className="mt-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-[8px] overflow-hidden"
              style={{
                background: "rgba(21,18,40,0.5)",
                borderColor: "rgba(42,37,69,0.6)",
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold">
                  Settlement List
                </CardTitle>
                <div className="pt-1">
                  <StatusLegend />
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-0">
                {settlementsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : settlementsQuery.error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-6">
                    <p>{String(settlementsQuery.error)}</p>
                    <p className="text-sm mt-2">
                      Run{" "}
                      <code className="bg-muted px-1 rounded">
                        npm run dev:all
                      </code>{" "}
                      from the repo root.
                    </p>
                  </div>
                ) : !settlements.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-6">
                    <FileX className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium text-foreground">
                      No settlements yet
                    </p>
                    <p className="text-sm mt-1">
                      Start a settlement from the Telegram bot
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-border/30">
                      {paginatedSettlements.map((s, i) => (
                        <SettlementRow
                          key={s.id}
                          settlement={toRowData(s)}
                          index={i}
                          isLast={i === paginatedSettlements.length - 1}
                        />
                      ))}
                    </div>
                    <div className="mt-4 px-4 pb-4 flex items-center justify-between border-t border-border/30 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {settlementsPage} of {totalSettlementPages} (
                        {totalSettlements} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSettlementsPage((p) => Math.max(1, p - 1))
                          }
                          disabled={settlementsPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSettlementsPage((p) =>
                              Math.min(totalSettlementPages, p + 1),
                            )
                          }
                          disabled={settlementsPage >= totalSettlementPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </motion.div>
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="rounded-xl border border-border/60 overflow-hidden"
              style={{
                background: "rgba(21,18,40,0.5)",
                borderColor: "rgba(42,37,69,0.6)",
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold">
                  Position Monitoring
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Active positions with monitoring status from the Telegram bot
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {positionsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : positionsQuery.error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-6">
                    <p>{String(positionsQuery.error)}</p>
                    <p className="text-sm mt-2">
                      Run{" "}
                      <code className="bg-muted px-1 rounded">
                        npm run dev:all
                      </code>{" "}
                      from the repo root.
                    </p>
                  </div>
                ) : !positions.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-6">
                    <Activity className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium text-foreground">
                      No active positions
                    </p>
                    <p className="text-sm mt-1">
                      Positions will appear here after settlements are executed
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 px-4">
                      {paginatedPositions.map((p) => (
                        <div
                          key={p.positionId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/30 bg-card/30"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono text-[15px] font-semibold truncate">
                                {p.positionId.length > 12
                                  ? `${p.positionId.slice(0, 8)}...${p.positionId.slice(-4)}`
                                  : p.positionId}
                              </span>
                              {p.latestMonitoringStatus && (
                                <StatusBadge
                                  status={p.latestMonitoringStatus as any}
                                  size="sm"
                                  showDot
                                />
                              )}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              Pool: {p.poolAddress.slice(0, 10)}...
                              {p.poolAddress.slice(-8)} • {p.chain}
                            </div>
                            <div className="text-[13px] text-foreground-faint font-mono mt-1">
                              Deposit: {formatAmount(p.depositAmount)} •
                              Liquidity:{" "}
                              {p.latestLiquidity != null
                                ? formatAmount(p.latestLiquidity)
                                : "—"}
                            </div>
                            {p.lastScanAt && (
                              <div className="text-xs text-foreground-faint font-mono mt-1">
                                Last scan: {formatTimestamp(p.lastScanAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 px-4 pb-4 flex items-center justify-between border-t border-border/30 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {positionsPage} of {totalPositionPages} (
                        {totalPositions} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPositionsPage((p) => Math.max(1, p - 1))
                          }
                          disabled={positionsPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPositionsPage((p) =>
                              Math.min(totalPositionPages, p + 1),
                            )
                          }
                          disabled={positionsPage >= totalPositionPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
