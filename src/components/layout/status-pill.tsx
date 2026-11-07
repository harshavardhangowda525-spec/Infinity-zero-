"use client";
import * as React from "react";
import { Cpu, FlaskConical, Database, HardDrive } from "lucide-react";
import { useStatus } from "./providers";
import { cn } from "@/lib/utils";

export function StatusPill() {
  const s = useStatus();
  if (!s.loaded) return <span className="h-7 w-28 animate-pulse rounded-full bg-white/5" aria-hidden />;
  const ai = s.aiProviders.length > 0;
  const tip = [
    ai ? `AI: ${s.aiProviders.map((p) => p.name).join(" → ")} (fallback order)` : "AI: no provider key — sample/rule-based analysis",
    s.supabase ? "Data: Supabase" : "Data: stored on this device (demo mode)",
  ].join("\n");
  return (
    <span title={tip} className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
          ai ? "border-success/30 bg-success/10 text-success" : "border-amber/30 bg-amber/10 text-amber",
        )}
      >
        {ai ? <Cpu className="size-3" /> : <FlaskConical className="size-3" />}
        {ai ? `AI · ${s.aiProviders[0].name}` : "Demo mode"}
      </span>
      <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white/5 px-2.5 py-1 text-[11px] text-muted sm:inline-flex">
        {s.supabase ? <Database className="size-3" /> : <HardDrive className="size-3" />}
        {s.supabase ? (s.userEmail ? "Synced" : "Guest") : "Local data"}
      </span>
    </span>
  );
}
