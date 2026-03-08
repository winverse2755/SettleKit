"use client";

import { motion } from "framer-motion";
import { defaultViewport, fadeIn } from "@/lib/animations";

const PARTNERS = ["Base", "Arc", "Unichain", "Circle", "Chainlink"];

export function TrustedBy() {
  return (
    <section id="trusted-by" className="w-full py-16 border-y border-border/40">
      <motion.div
        className="container mx-auto px-4 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        variants={fadeIn}
      >
        <p className="text-[11px] uppercase tracking-[3px] text-foreground-faint mb-8">
          Trusted by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
          {PARTNERS.map((name, i) => (
            <motion.span
              key={name}
              className="text-lg font-medium text-foreground-muted grayscale hover:text-foreground duration-300 hover:scale-120 cursor-pointer"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 0.5, x: 0 }}
              viewport={defaultViewport}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {name}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
