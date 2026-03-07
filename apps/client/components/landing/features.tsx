'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Lock,
  BarChart3,
  Globe,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import { fadeUp, staggerContainer, defaultViewport } from '@/lib/animations';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Risk Management',
    desc: 'Advanced AI-powered risk assessment with real-time metrics and automated decision making',
    featured: true,
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'Optimized cross-chain transfers with minimal latency and maximum throughput',
    featured: false,
  },
  {
    icon: Lock,
    title: 'Secure by Design',
    desc: 'Battle-tested smart contracts with comprehensive security audits and insurance coverage',
    featured: false,
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Comprehensive dashboards with detailed metrics, logs, and performance insights',
    featured: true,
  },
  {
    icon: Globe,
    title: 'Multi-Chain Support',
    desc: 'Seamless integration across Base, Arc, and Unichain with more chains coming soon',
    featured: true,
  },
  {
    icon: Bot,
    title: 'Automated Execution',
    desc: 'Set it and forget it — intelligent automation handles the entire liquidity provision flow',
    featured: false,
  },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  featured,
  index,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  featured: boolean;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'min-h-full rounded-2xl p-8 border border-border/60 bg-card/50 backdrop-blur-[8px] transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]',
        featured && 'md:row-span-1'
      )}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 mb-5">
        <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-[15px] text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px] text-primary mb-3">
            Features
          </p>
          <h2 className="text-3xl md:text-[44px] font-bold text-foreground mb-4">
            Why Choose SettleKit
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade features designed for professional DeFi operations
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={staggerContainer}
        >
          {/* Row 1: Risk Management (large) + Lightning Fast */}
          <div className="md:col-span-2 self-stretch">
            <FeatureCard {...FEATURES[0]} index={0} />
          </div>
          <div className="self-stretch">
            <FeatureCard {...FEATURES[1]} index={1} />
          </div>
          {/* Row 2: Secure + Real-Time Analytics (large) */}
          <div className="self-stretch">
            <FeatureCard {...FEATURES[2]} index={2} />
          </div>
          <div className="md:col-span-2 self-stretch">
            <FeatureCard {...FEATURES[3]} index={3} />
          </div>
          {/* Row 3: Multi-Chain + Automated */}
          <div className="md:col-span-2 self-stretch">
            <FeatureCard {...FEATURES[4]} index={4} />
          </div>
          <div className="self-stretch">
            <FeatureCard {...FEATURES[5]} index={5} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
