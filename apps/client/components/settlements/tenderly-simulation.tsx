'use client';

import { FlaskConical, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface TenderlySim {
  success: boolean;
  gasEstimate: string;
  expectedOutput: string;
  vnetId?: string;
  txHash?: string;
}

interface TenderlySimulationProps {
  tenderlySim: TenderlySim;
  explorerUrl?: string;
}

export function TenderlySimulation({ tenderlySim, explorerUrl }: TenderlySimulationProps) {
  return (
    <Card
      className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-[8px] overflow-hidden"
      style={{
        background: 'rgba(21,18,40,0.5)',
        borderColor: 'rgba(42,37,69,0.6)',
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <FlaskConical className="h-5 w-5 text-primary" />
          Tenderly Simulation
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">CRE workflow trace</p>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        <div className="flex items-center gap-2">
          {tenderlySim.success ? (
            <>
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-base font-semibold text-success">Success</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-base font-semibold text-destructive">Failed</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Gas Estimate
            </div>
            <div className="font-mono text-xl font-semibold text-foreground">
              {tenderlySim.gasEstimate}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Expected Output
            </div>
            <div className="font-mono text-xl font-semibold text-foreground">
              {tenderlySim.expectedOutput}
            </div>
          </div>
        </div>
        {explorerUrl && (
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            asChild
          >
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View on Tenderly Explorer
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
