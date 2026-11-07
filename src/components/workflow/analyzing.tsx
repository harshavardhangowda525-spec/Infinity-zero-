"use client";
import * as React from "react";
import { motion } from "framer-motion";

const STAGES = ["Reading your workflow", "Breaking it into steps", "Looking for friction patterns", "Estimating time impact", "Preparing recommendations"];

export function Analyzing() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(STAGES.length - 1, x + 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" aria-live="polite" className="glass gradient-border flex flex-col items-center gap-6 rounded-2xl px-6 py-14 text-center">
      <div className="relative size-24">
        {[0, 1, 2].map((r) => (
          <motion.span
            key={r}
            className="absolute inset-0 rounded-full border border-cyan/40"
            animate={{ scale: [0.6, 1.25], opacity: [0.8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: r * 0.6, ease: "easeOut" }}
          />
        ))}
        <motion.span
          className="absolute inset-6 rounded-full bg-gradient-to-br from-cyan via-royal to-violet"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div>
        <p className="font-display text-lg font-semibold">{STAGES[i]}…</p>
        <div className="mx-auto mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" animate={{ width: `${((i + 1) / STAGES.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
