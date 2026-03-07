"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

export interface OracleDataReport {
  ethUsdPrice: string;
  usdcUsdPrice: string;
  timestamp: number;
}

interface OraclePricesProps {
  oracleData: OracleDataReport;
}

const formatPrice = (price: string) => {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price) / 1e8);
};

export function OraclePrices({ oracleData }: OraclePricesProps) {
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
          <TrendingUp className="h-5 w-5 text-primary" />
          Oracle Prices
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Prices used at {formatTimestamp(oracleData.timestamp)}
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              ETH/USD
            </div>
            <div className="font-mono text-2xl font-bold text-foreground">
              {formatPrice(oracleData?.ethUsdPrice ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              USDC/USD
            </div>
            <div className="font-mono text-2xl font-bold text-foreground">
              {formatPrice(oracleData?.usdcUsdPrice ?? 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
