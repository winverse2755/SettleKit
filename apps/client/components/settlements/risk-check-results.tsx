"use client";

import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskCheckRow, type RiskCheck } from "./risk-check-row";
import { cn } from "@/lib/utils";

interface RiskCheckResultsProps {
  checks: RiskCheck[];
}

export function RiskCheckResults({ checks }: RiskCheckResultsProps) {
  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const allPassed = passed === total;
  const anyFailed = passed < total;

  return (
    <Card
      className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-[8px] overflow-hidden"
      style={{
        background: "rgba(21,18,40,0.5)",
        borderColor: "rgba(42,37,69,0.6)",
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Risk Check Results
          <div
            className={cn(
              "self-start ml-5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              allPassed && "bg-success/15 text-success",
              anyFailed && "bg-destructive/15 text-destructive",
            )}
          >
            {allPassed ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {passed}/{total} checks passed
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                {passed}/{total} passed, {total - passed} failed
              </>
            )}
          </div>
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">
          CRE workflow risk assessment
        </p>
      </CardHeader>
      <CardContent className="pt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {checks.map((check, i) => (
          <RiskCheckRow key={`${check.name}-${i}`} check={check} index={i} />
        ))}
      </CardContent>
    </Card>
  );
}
