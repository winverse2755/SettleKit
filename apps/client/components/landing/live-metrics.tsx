'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, defaultViewport } from '@/lib/animations';

const STATS = [
  { value: 2.4, suffix: 'M+', label: 'Total Value Locked', isDecimal: true },
  { value: 12400, suffix: '+', label: 'Transactions Processed', isDecimal: false },
  { value: 3, suffix: '', label: 'Chains Supported', isDecimal: false },
  { value: 99.9, suffix: '%', label: 'Uptime', isDecimal: true },
];

function AnimatedStat({
  target,
  suffix,
  label,
  isDecimal,
  delay,
}: {
  target: number;
  suffix: string;
  label: string;
  isDecimal: boolean;
  delay: number;
}) {
  const [display, setDisplay] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setHasAnimated(true);
        const start = performance.now();
        const duration = 2000;

        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const current = target * easeOut;
          setDisplay(current);
          if (progress < 1) requestAnimationFrame(tick);
        }

        const t = setTimeout(() => requestAnimationFrame(tick), delay);
        return () => clearTimeout(t);
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, delay, hasAnimated]);

  const displayStr = isDecimal ? display.toFixed(1) : Math.round(display).toLocaleString();

  return (
    <div ref={ref} className="text-center">
      <div className="font-mono text-4xl md:text-5xl font-bold text-foreground">
        {displayStr}
        {suffix}
      </div>
      <div className="w-10 h-0.5 bg-primary mx-auto mt-2 rounded-full" />
      <p className="text-sm text-muted-foreground mt-3">{label}</p>
    </div>
  );
}

export function LiveMetrics() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)',
        }}
      />
      <div className="container mx-auto px-4 relative">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          {STATS.map((stat, i) => (
            <AnimatedStat
              key={stat.label}
              target={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              isDecimal={stat.isDecimal}
              delay={i * 150}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
