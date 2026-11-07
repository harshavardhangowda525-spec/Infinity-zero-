"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  const id = `lg-${React.useId().replace(/:/g, "")}`; // unique per instance: hidden copies must not own the gradient
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#00D9FF" />
            <stop offset="0.5" stopColor="#4169FF" />
            <stop offset="1" stopColor="#865DFF" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="11" fill="#0b1122" stroke={`url(#${id})`} strokeWidth="1.5" />
        <path d="M11 20c0-3 2.2-5 4.7-5 4.6 0 6.1 10 10.6 10 2.5 0 4.7-2 4.7-5s-2.2-5-4.7-5c-4.5 0-6 10-10.6 10C13.2 25 11 23 11 20Z" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold tracking-[0.18em] text-ink">
            INFINITY <span className="text-gradient">ZERO</span>
          </span>
          <span className="mt-1 text-[10px] tracking-wide text-subtle">by Infinity Web &amp; Apps</span>
        </span>
      )}
    </span>
  );
}
