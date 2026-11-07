"use client";
import * as React from "react";
import { Download, Share, SquarePlus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { useInstall } from "./pwa";
import { cn } from "@/lib/utils";

/** "Install app" control. Uses the native prompt where available; shows steps otherwise. Hidden once installed. */
export function InstallButton({ variant = "chip", className }: { variant?: "chip" | "button"; className?: string }) {
  const { standalone, canPrompt, ios, install } = useInstall();
  const [help, setHelp] = React.useState(false);
  if (standalone) return null;

  const onClick = async () => {
    if (canPrompt) {
      const ok = await install();
      if (ok) toast.success("Infinity ZERO installed", { description: "Open it from your home screen." });
    } else setHelp(true);
  };

  return (
    <>
      {variant === "chip" ? (
        <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan hover:bg-cyan/20", className)}>
          <Download className="size-3.5" /> Install app
        </button>
      ) : (
        <Button onClick={onClick} className={className}><Smartphone /> Install Infinity ZERO</Button>
      )}
      <Modal open={help} onOpenChange={setHelp}>
        <ModalContent title="Install Infinity ZERO" description="Add it to your home screen to use it like any other app — full screen, with its own icon.">
          {ios ? (
            <ol className="space-y-3 text-sm text-muted">
              <li className="flex gap-3"><Step n={1} /> Open this page in <strong className="text-ink">Safari</strong>.</li>
              <li className="flex gap-3"><Step n={2} /> Tap the <Share className="inline size-4 text-cyan" /> <strong className="text-ink">Share</strong> button.</li>
              <li className="flex gap-3"><Step n={3} /> Choose <SquarePlus className="inline size-4 text-cyan" /> <strong className="text-ink">Add to Home Screen</strong>, then tap Add.</li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-muted">
              <li className="flex gap-3"><Step n={1} /> Open this page in <strong className="text-ink">Chrome</strong> (Android) or Chrome / Edge (computer).</li>
              <li className="flex gap-3"><Step n={2} /> Open the browser menu <strong className="text-ink">⋮</strong>.</li>
              <li className="flex gap-3"><Step n={3} /> Tap <strong className="text-ink">Install app</strong> or <strong className="text-ink">Add to Home screen</strong>.</li>
            </ol>
          )}
          <Button className="mt-6 w-full" variant="secondary" onClick={() => setHelp(false)}>Got it</Button>
        </ModalContent>
      </Modal>
    </>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-cyan/15 text-xs font-semibold text-cyan">{n}</span>;
}
