'use client';

import { cn } from '@/lib/utils';

export type SettlementStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'WARNING'
  | 'BLOCKED'
  | 'EXECUTED'
  | 'FAILED';

export type MonitoringStatus = 'HEALTHY' | 'MOVE_RECOMMENDED';

const STATUS_MAP: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  EXECUTED: { bg: 'rgba(52,211,153,0.15)', text: '#34D399', dot: '#34D399' },
  APPROVED: { bg: 'rgba(52,211,153,0.15)', text: '#34D399', dot: '#34D399' },
  FAILED: { bg: 'rgba(248,113,113,0.15)', text: '#F87171', dot: '#F87171' },
  BLOCKED: { bg: 'rgba(248,113,113,0.15)', text: '#F87171', dot: '#F87171' },
  WARNING: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24', dot: '#FBBF24' },
  PENDING: { bg: 'rgba(155,149,176,0.15)', text: '#9B95B0', dot: '#9B95B0' },
  HEALTHY: { bg: 'rgba(52,211,153,0.15)', text: '#34D399', dot: '#34D399' },
  MOVE_RECOMMENDED: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24', dot: '#FBBF24' },
};

const defaultStyle = { bg: 'rgba(155,149,176,0.15)', text: '#9B95B0', dot: '#9B95B0' };

export function getStatusDotColor(status: string): string {
  return STATUS_MAP[status]?.dot ?? defaultStyle.dot;
}

interface StatusBadgeProps {
  status: SettlementStatus | MonitoringStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const style = STATUS_MAP[status] ?? defaultStyle;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-[13px] px-3 py-1',
    lg: 'text-[13px] px-3 py-1',
  };

  const dotSizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-[10px] h-[10px]' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {showDot && (
        <span
          className={cn('rounded-full shrink-0', dotSizes[size])}
          style={{ backgroundColor: style.dot }}
        />
      )}
      {status}
    </span>
  );
}

/** Row of mini status badges for legend */
const LEGEND_ITEMS: { status: SettlementStatus; label: string }[] = [
  { status: 'APPROVED', label: 'APPROVED' },
  { status: 'WARNING', label: 'WARNING' },
  { status: 'BLOCKED', label: 'BLOCKED' },
  { status: 'PENDING', label: 'PENDING' },
  { status: 'EXECUTED', label: 'EXECUTED' },
  { status: 'FAILED', label: 'FAILED' },
];

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {LEGEND_ITEMS.map(({ status }) => (
        <StatusBadge key={status} status={status} size="sm" showDot />
      ))}
    </div>
  );
}
