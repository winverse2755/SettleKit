"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STAGGER = {
  badge: 0,
  line1: 150,
  line2: 300,
  subtext: 500,
  buttons: 700,
  trust: 900,
};

export function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(139,92,246,0.15) 0%, transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Floating orbs */}
      <div
        className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full opacity-30 blur-3xl animate-float-purple"
        style={{ background: "rgba(139,92,246,0.4)" }}
      />
      <div
        className="absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full opacity-25 blur-3xl animate-float-cyan"
        style={{ background: "rgba(34,211,238,0.3)" }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: STAGGER.badge / 1000,
          }}
        >
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium border border-primary/60 text-primary bg-primary/5 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            Powered by CRE & CCTP
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            delay: STAGGER.line1 / 1000,
          }}
          className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-extrabold tracking-tight text-foreground leading-[1.1]"
        >
          Cross-Chain Settlement
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            delay: STAGGER.line2 / 1000,
          }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-extrabold tracking-tight italic leading-[1.1]"
          style={{
            background: "linear-gradient(90deg, #8B5CF6, #C084FC, #22D3EE)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Made Simple
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: STAGGER.subtext / 1000,
          }}
          className="mt-6 text-base sm:text-lg text-muted-foreground max-w-[640px] mx-auto leading-relaxed"
        >
          Automated USDC deposits across DeFi pools and vaults with agentic risk
          assessment and monitoring.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: STAGGER.buttons / 1000,
          }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="text-base bg-gradient-to-r from-primary via-secondary to-primary/90 text-primary-foreground hover:opacity-90 transition-opacity"
            asChild
          >
            <Link href="/settlements">
              Risk Report
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base border-border"
            asChild
          >
            <a
              href="https://github.com/winverse2755/SettleKit/tree/main"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Documentation
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
