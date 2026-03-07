import { type Variants } from "framer-motion";

/** Fade up — most common section reveal */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/** Fade in — no movement */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

/** Scale in — for icons, circles */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

/** Stagger container — use with staggerChildren on parent */
export const staggerContainer: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/** Default viewport options for scroll-triggered animations */
export const defaultViewport = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -80px 0px",
};

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Format number for display (e.g. 2400000 -> "2.4M+") */
export function formatCounterValue(value: number, suffix: string = ""): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M${suffix}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k${suffix}`;
  return `${Math.round(value)}${suffix}`;
}
