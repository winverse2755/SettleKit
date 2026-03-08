'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SettlementStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'WARNING'
  | 'BLOCKED'
  | 'EXECUTED'
  | 'FAILED';

export type MonitoringStatus = 'HEALTHY' | 'MOVE_RECOMMENDED';

interface SettlementStatusBadgeProps {
  status: SettlementStatus | MonitoringStatus;
  className?: string;
}

export function SettlementStatusBadge({ status, className }: SettlementStatusBadgeProps) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    APPROVED: { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600' },
    WARNING: { variant: 'secondary', className: 'bg-amber-600 hover:bg-amber-600 text-amber-50' },
    BLOCKED: { variant: 'destructive' },
    PENDING: { variant: 'secondary', className: 'bg-slate-600 hover:bg-slate-600 text-slate-100' },
    EXECUTED: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
    FAILED: { variant: 'destructive' },
    HEALTHY: { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600' },
    MOVE_RECOMMENDED: { variant: 'secondary', className: 'bg-amber-600 hover:bg-amber-600 text-amber-50' },
  };

  const { variant, className: statusClass } = config[status] ?? {
    variant: 'outline' as const,
    className: '',
  };

  return (
    <Badge
      variant={variant}
      className={cn(statusClass, className)}
    >
      {status}
    </Badge>
  );
}
