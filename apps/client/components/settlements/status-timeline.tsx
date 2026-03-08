'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LifecycleStep = 'created' | 'risk_check' | 'simulation' | 'execution' | 'complete';

const STEPS: { id: LifecycleStep; label: string }[] = [
  { id: 'created', label: 'Created' },
  { id: 'risk_check', label: 'Risk Check' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'execution', label: 'Execution' },
  { id: 'complete', label: 'Complete' },
];

function stepIndex(step: LifecycleStep): number {
  const i = STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

interface StatusTimelineProps {
  status: string;
  /** Which step we're at (derived from status if not provided) */
  currentStep?: LifecycleStep;
  /** If set, this step is failed (red dot + X) */
  failedStep?: LifecycleStep | null;
}

export function StatusTimeline({
  status,
  currentStep,
  failedStep,
}: StatusTimelineProps) {
  const currentIdx = currentStep
    ? stepIndex(currentStep)
    : status === 'EXECUTED' || status === 'FAILED'
      ? 4
      : status === 'APPROVED' || status === 'WARNING' || status === 'BLOCKED'
        ? 2
        : status === 'PENDING'
          ? 0
          : 1;

  return (
    <div className="w-full py-4">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex min-w-max items-center justify-between gap-0 overflow-x-auto">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIdx || (i === currentIdx && (status === 'EXECUTED' || status === 'FAILED'));
          const isCurrent = i === currentIdx;
          const isFailed = failedStep && step.id === failedStep;
          const isFuture = i > currentIdx && !isFailed;
          const lineCompleted = i < currentIdx && (!failedStep || stepIndex(failedStep) > i);
          const lineFailed = failedStep && i === stepIndex(failedStep) - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold md:h-12 md:w-12',
                    isFailed &&
                      'border-destructive bg-destructive/15 text-destructive',
                    isCompleted &&
                      !isFailed &&
                      'border-primary bg-primary/20 text-primary',
                    isCurrent &&
                      !isFailed &&
                      'border-primary bg-primary/20 text-primary',
                    isFuture && 'border-border bg-muted/30 text-muted-foreground'
                  )}
                >
                  {isFailed ? (
                    <X className="h-5 w-5" />
                  ) : isCompleted || (isCurrent && (status === 'EXECUTED' || status === 'FAILED')) ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span className="mt-2 text-[11px] text-muted-foreground whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6 md:w-12 shrink-0',
                    lineCompleted && 'bg-primary',
                    lineFailed && 'bg-destructive',
                    !lineCompleted && !lineFailed && 'bg-border border-dashed'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIdx || (i === currentIdx && (status === 'EXECUTED' || status === 'FAILED'));
          const isCurrent = i === currentIdx;
          const isFailed = failedStep && step.id === failedStep;
          const isFuture = i > currentIdx && !isFailed;
          const lineCompleted = i < currentIdx && (!failedStep || stepIndex(failedStep) > i);
          const lineFailed = failedStep && i === stepIndex(failedStep) - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <motion.div
                  initial={false}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                    isFailed &&
                      'border-destructive bg-destructive/15 text-destructive',
                    isCompleted &&
                      !isFailed &&
                      'border-primary bg-primary/20 text-primary',
                    isCurrent &&
                      !isFailed &&
                      'border-primary bg-primary/20 text-primary',
                    isFuture && 'border-border bg-muted/30 text-muted-foreground'
                  )}
                >
                  {isFailed ? (
                    <X className="h-5 w-5" />
                  ) : isCompleted || (isCurrent && (status === 'EXECUTED' || status === 'FAILED')) ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span className="text-[11px] text-muted-foreground">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'ml-5 h-6 w-0.5 shrink-0',
                    lineCompleted && 'bg-primary',
                    lineFailed && 'bg-destructive',
                    !lineCompleted && !lineFailed && 'bg-border border-l border-dashed'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
