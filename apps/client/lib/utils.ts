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

/** Tenderly project TX base (same as backend/Telegram bot). */
const TENDERLY_PROJECT_TX_BASE =
  process.env.NEXT_PUBLIC_TENDERLY_PROJECT_TX_BASE ??
  "https://dashboard.tenderly.co/winverse/project/testnet/22cbc0df-919d-4cdc-927b-436480a7129f"

/** Build Tenderly explorer URL for a tx (matches link sent by Telegram bot after execution). */
export function getTenderlyTxUrl(txHash: string): string {
  return `${TENDERLY_PROJECT_TX_BASE}/tx/${txHash}`
}
