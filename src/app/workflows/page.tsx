"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Beaker, FolderKanban, ScanSearch, Trash2, Waypoints } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { SourceBadge } from "@/components/workflow/source-badge";
import { cap } from "@/components/workflow/meta";
import { actions, useAppState, useHydrated } from "@/lib/store";
import { weeklySavedMinutes } from "@/lib/analysis";
import { formatMinutes } from "@/lib/calc";
import { formatDate } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

export default function MyWorkflowsPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const workflows = useAppState((s) => s.workflows);
  const analyses = useAppState((s) => s.analyses);
  const plans = useAppState((s) => s.plans);
  const [confirm, setConfirm] = React.useState<Workflow | null>(null);

  const go = (analysisId: string, path: string) => {
    actions.setActive(analysisId);
    router.push(path);
  };

  return (
    <div>
      <PageHeader
        eyebrow="My Workflows"
        title="Saved workflows & plans"
        subtitle="Every workflow you analyse is kept here with its analysis and improvement plan."
        actions={<Button asChild><Link href="/analyze"><ScanSearch /> New analysis</Link></Button>}
      />
      {!hydrated ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title="No workflows yet"
          body="Analyse a workflow — your own or a sample scenario — and it will appear here."
          action={<><Button asChild><Link href="/analyze">Analyze a workflow</Link></Button><Button variant="secondary" asChild><Link href="/demo">Try the Live Demo</Link></Button></>}
        />
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => {
            const a = analyses.find((x) => x.workflowId === w.id);
            const plan = a ? plans.find((p) => p.analysisId === a.id) : undefined;
            return (
              <Card key={w.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-semibold">{w.title}</h2>
                      {a && <SourceBadge source={a.source} />}
                      {plan && <Badge tone={plan.status === "implemented" ? "success" : plan.status === "rejected" ? "danger" : "cyan"}>{cap(plan.status)}</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{w.description}</p>
                    <p className="mt-2 text-xs text-subtle">
                      {w.category} · {w.perWeek}×/week · {formatMinutes(w.avgMinutes)} per run · {formatDate(w.createdAt)}
                      {a && <> · <span className="text-cyan">{a.frictionPoints.length} friction points · est. {formatMinutes(weeklySavedMinutes(a))}/week</span></>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a && <Button size="sm" variant="secondary" onClick={() => go(a.id, "/friction")}><Waypoints /> Friction</Button>}
                    {a && <Button size="sm" onClick={() => go(a.id, "/lab")}><Beaker /> Lab</Button>}
                    <Button size="sm" variant="ghost" aria-label={`Delete ${w.title}`} onClick={() => setConfirm(w)}><Trash2 /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        {confirm && (
          <ModalContent title="Delete this workflow?" description={`“${confirm.title}”, its analysis, plan and measurements will be removed. This can't be undone.`}>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { actions.deleteWorkflow(confirm.id); setConfirm(null); toast.success("Workflow deleted"); }}><Trash2 /> Delete</Button>
            </div>
          </ModalContent>
        )}
      </Modal>
    </div>
  );
}
