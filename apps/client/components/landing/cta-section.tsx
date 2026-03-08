'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeUp, defaultViewport } from '@/lib/animations';

export function CtaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-[#0A1A1A]"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.1) 0%, #0A1A1A 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.15] animate-pulse-slow pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.2) 0%, transparent 70%)',
        }}
      />

      <div className="container mx-auto px-4 relative text-center">
        <motion.h2
          className="text-4xl md:text-[48px] font-extrabold text-foreground mb-4"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          Ready to Get Started?
        </motion.h2>
        <motion.p
          className="text-lg text-muted-foreground max-w-xl mx-auto mb-8"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          Join users leveraging SettleKit for cross-chain liquidity
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <Button
            size="lg"
            className="text-base bg-gradient-to-r from-primary via-secondary to-primary/90 text-primary-foreground"
            asChild
          >
            <Link href="/settlements">
              Monitor Status
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base border-border" asChild>
            <a href="mailto:winverse2755@gmail.com">Contact</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
