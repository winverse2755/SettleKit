'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { fadeUp, scaleIn, defaultViewport, staggerContainer } from '@/lib/animations';
import { cn } from '@/lib/utils';

const ACTIVE_CHAINS = [
  { name: 'Base', id: 'base' },
  { name: 'Arc', id: 'arc' },
  { name: 'Unichain', id: 'unichain' },
];

const COMING_SOON = [
  { name: 'Ethereum', id: 'eth' },
  { name: 'Arbitrum', id: 'arb' },
  { name: 'Optimism', id: 'op' },
];

function ChainPill({
  name,
  comingSoon,
  index,
}: {
  name: string;
  comingSoon: boolean;
  index: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        variants={scaleIn}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 transition-all',
          comingSoon
            ? 'border-border/50 bg-muted/30 opacity-60'
            : 'border-primary/50 bg-primary/5'
        )}
      >
        <span className={cn('text-sm font-semibold', comingSoon && 'text-muted-foreground')}>
          {name.slice(0, 2).toUpperCase()}
        </span>
        {comingSoon && (
          <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
            Soon
          </Badge>
        )}
      </motion.div>

      <span className="text-sm font-semibold text-foreground-muted">
        {name}
      </span>
    </div>
  );
}

export function SupportedChains() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          className="mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px] text-primary mb-3">
            Ecosystem
          </p>
          <h2 className="text-3xl md:text-[36px] font-bold text-foreground mb-4">
            Multi-Chain by Default
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={staggerContainer}
        >
          {ACTIVE_CHAINS.map((chain, i) => (
            <ChainPill key={chain.id} name={chain.name} comingSoon={false} index={i} />
          ))}
          {COMING_SOON.map((chain, i) => (
            <ChainPill key={chain.id} name={chain.name} comingSoon index={ACTIVE_CHAINS.length + i} />
          ))}
        </motion.div>

        <motion.p
          className="mt-8 text-sm text-foreground-faint"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          More chains added quarterly
        </motion.p>
      </div>
    </section>
  );
}
