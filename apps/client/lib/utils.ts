import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format raw token amount (e.g. USDC 6 decimals) to human-readable string. */
export function formatAmount(rawAmount: string | number, decimals: number = 6): string {
  const raw = typeof rawAmount === "string" ? rawAmount : String(rawAmount)
  if (!raw || !/^\d+$/.test(raw)) return raw
  const value = Number(raw) / Math.pow(10, decimals)
  const formatted = value.toFixed(Math.min(decimals, 6))
  return formatted.replace(/\.?0+$/, "") || "0"
}
