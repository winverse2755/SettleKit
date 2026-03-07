"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RiskCheck {
  name: string;
  passed: boolean;
  actual: string | number;
  threshold: string | number;
  severity: string;
  description?: string;
}

interface RiskCheckRowProps {
  check: RiskCheck;
  index: number;
}

export function RiskCheckRow({ check, index }: RiskCheckRowProps) {
  const accentColor = check.passed
    ? "rgb(52,211,153)" // success
    : check.severity === "warning"
      ? "rgb(251,191,36)" // warning
      : "rgb(248,113,113)"; // destructive

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={cn(
        "group flex gap-4 rounded-lg p-4 transition-all duration-200 border hover:bg-muted/30",
        "bg-card/30",
      )}
    >
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-foreground capitalize">
          {check.name}
        </div>
        {check.description && (
          <div className="text-[13px] text-muted-foreground mt-0.5">
            {check.description}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[13px] font-mono text-foreground">
          Actual: {String(check.actual)}
        </div>
        <div className="text-[13px] font-mono text-muted-foreground">
          Threshold: {String(check.threshold)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-7 text-xs"
          title="More info"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
