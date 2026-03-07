'use client';

import { motion } from 'framer-motion';
import { fadeUp, scaleIn, defaultViewport } from '@/lib/animations';

const STEPS = [
  {
    num: '01',
    title: 'Connect Your Wallet',
    desc: 'Connect your Web3 wallet and select your source chain',
  },
  {
    num: '02',
    title: 'Configure Parameters',
    desc: 'Set transfer amount, risk tolerance, and execution preferences',
  },
  {
    num: '03',
    title: 'AI Risk Assessment',
    desc: 'Our AI analyzes market conditions and provides risk recommendations',
  },
  {
    num: '04',
    title: 'Automated Execution',
    desc: 'Funds are bridged via CCTP and liquidity is automatically provided',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 border-t border-border/40">
      <div className="container mx-auto px-4 lg:px-8 max-w-[800px]">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeUp}
        >
          <p className="text-xs font-semibold uppercase tracking-[2px] text-primary mb-3">
            Process
          </p>
          <h2 className="text-3xl md:text-[44px] font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">Simple, secure, and automated</p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          {/* <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-accent-cyan opacity-60 rounded-full [mask-image:linear-gradient(to_bottom,black,black)]" /> */}

          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative flex gap-6 items-start"
                initial="hidden"
                whileInView="visible"
                viewport={defaultViewport}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.2,
                      delayChildren: 0.1,
                    },
                  },
                }}
              >
                <motion.div
                  variants={scaleIn}
                  className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40"
                >
                  <span className="text-2xl font-bold font-mono text-primary">{step.num}</span>
                </motion.div>
                <motion.div variants={fadeUp} className="flex-1 pt-2">
                  <h3 className="text-[22px] font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-[15px] text-muted-foreground">{step.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
