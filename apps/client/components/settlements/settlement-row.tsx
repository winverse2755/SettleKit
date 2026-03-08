"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, getStatusDotColor } from "./status-badge";
import { getTenderlyTxUrl } from "@/lib/utils";
import { formatAmount } from "@/lib/utils";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

export interface SettlementRowData {
  id: string;
  status: string;
  sourceChain: string;
  targetChain: string;
  token: string;
  amount: string;
  createdAt: number;
  txHash?: string;
  riskReport?: { explorerUrl?: string };
  explorerUrl?: string;
}

function truncateId(id: string) {
  if (id.match(/^stl-\d+$/)) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

interface SettlementRowProps {
  settlement: SettlementRowData;
  index: number;
  isLast?: boolean;
}

export function SettlementRow({
  settlement,
  index,
  isLast,
}: SettlementRowProps) {
  const explorerUrl = settlement.txHash
    ? getTenderlyTxUrl(settlement.txHash)
    : settlement.riskReport?.explorerUrl || settlement.explorerUrl;

  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-8 transition-all duration-200 border-b border-border/30 hover:bg-primary/5 border-l-2 border-l-transparent hover:border-l-primary",
        isLast && "border-b-0",
      )}
    >
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-3 min-w-0 sm:flex-initial">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: getStatusDotColor(settlement.status) }}
          />
          <Link
            href={`/settlements/${settlement.id}`}
            className="font-mono text-[15px] font-semibold text-foreground hover:underline truncate"
          >
            {truncateId(settlement.id)}
          </Link>
          <StatusBadge status={settlement.status as any} size="sm" showDot />
        </div>

        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="truncate">{settlement.sourceChain}</span>
            <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{settlement.targetChain}</span>
          </span>
          <span className="text-[13px] text-foreground-faint font-mono">
            {formatAmount(settlement.amount)} {settlement.token} •{" "}
            {formatTimestamp(settlement.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/settlements/${settlement.id}`}>View</Link>
        </Button>
        {explorerUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
