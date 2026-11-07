"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Cpu, Database, LogIn, LogOut, Mail, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { ChoiceGroup } from "@/components/ui/choice";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { useStatus } from "@/components/layout/providers";
import { InstallButton } from "@/components/layout/install-button";
import { useInstall } from "@/components/layout/pwa";
import { actions, isCloudSync, useAppState } from "@/lib/store";
import { getBrowserSupabase } from "@/lib/supabase/client";

function AuthNotice() {
  const params = useSearchParams();
  React.useEffect(() => {
    const a = params.get("auth");
    if (a === "ok") toast.success("Signed in");
    if (a === "error") toast.error("Sign-in link was invalid or expired");
  }, [params]);
  return null;
}

export default function SettingsPage() {
  const status = useStatus();
  const { standalone } = useInstall();
  const settings = useAppState((s) => s.settings);
  const counts = { w: useAppState((s) => s.workflows.length), p: useAppState((s) => s.plans.length), m: useAppState((s) => s.measurements.length) };
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email address");
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setSending(false);
    if (error) toast.error("Couldn't send sign-in link", { description: error.message });
    else toast.success("Check your inbox", { description: "We sent you a secure sign-in link." });
  };

  const deleteAll = async () => {
    if (isCloudSync()) {
      const r = await fetch("/api/workflows", { method: "DELETE" });
      if (!r.ok) return toast.error("Couldn't delete account data from the server. Nothing was removed.");
    }
    actions.clearWorkData();
    actions.updateSettings({ hourlyValue: null });
    setConfirmDelete(false);
    toast.success(isCloudSync() ? "Your workflows were deleted from this device and your account" : "Your workflows were deleted from this device");
  };

  return (
    <div className="max-w-3xl">
      <React.Suspense><AuthNotice /></React.Suspense>
      <PageHeader eyebrow="Settings" title="Preferences & data" />

      <div className="space-y-5">
        <Card glow>
          <CardHeader><CardTitle>Infinity ZERO app</CardTitle><CardDescription>{standalone ? "You're using the installed app." : "Install it on your phone or computer — it opens full screen from its own icon and works offline for screens you've visited."}</CardDescription></CardHeader>
          {!standalone && <CardContent><InstallButton variant="button" /></CardContent>}
        </Card>

        <Card>
          <CardHeader><CardTitle>Account</CardTitle><CardDescription>Optional. Guests can use every feature; accounts sync workflows across devices.</CardDescription></CardHeader>
          <CardContent>
            {!status.supabase ? (
              <p className="text-sm text-muted">Accounts aren't configured for this deployment (no Supabase keys). Your data is kept in this browser.</p>
            ) : status.userEmail ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">Signed in as <span className="text-cyan">{status.userEmail}</span></p>
                <Button variant="secondary" onClick={() => getBrowserSupabase()?.auth.signOut().then(() => toast.success("Signed out"))}><LogOut /> Sign out</Button>
              </div>
            ) : (
              <form onSubmit={signIn} className="flex flex-col gap-2 sm:flex-row">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button type="submit" disabled={sending}>{sending ? <Mail /> : <LogIn />} {sending ? "Sending…" : "Email me a sign-in link"}</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="hourly">Your hourly value (₹, optional)</Label>
              <Input id="hourly" type="number" min={0} className="sm:w-60" placeholder="Not set" value={settings.hourlyValue ?? ""} onChange={(e) => actions.updateSettings({ hourlyValue: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} />
              <p className="text-xs text-subtle">Used only to show money estimates in the simulator. Leave blank to see time only.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Motion</p>
              <ChoiceGroup name="motion" label="Motion" value={settings.motion} onChange={(m) => actions.updateSettings({ motion: m })} options={[
                { value: "system", label: "Follow system", hint: "Respects reduced-motion" },
                { value: "reduced", label: "Reduce motion" },
                { value: "full", label: "Full motion" },
              ]} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Connections</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Cpu className="size-4 text-cyan" /> AI providers:
              {status.aiProviders.length ? status.aiProviders.map((p, i) => <Badge key={p.id} tone="cyan">{i + 1}. {p.name} · {p.model}</Badge>) : <Badge tone="amber">None — demo analysis</Badge>}
            </div>
            <p className="text-xs text-subtle">Providers are tried in order; if one is rate-limited or fails, the next takes over. With none available, a clearly labelled rule-based demo analysis is used.</p>
            <div className="flex flex-wrap items-center gap-2"><Database className="size-4 text-violet" /> Database: {status.supabase ? <Badge tone="success">Supabase</Badge> : <Badge tone="amber">This device (demo mode)</Badge>}</div>
          </CardContent>
        </Card>

        <Card className="border-danger/20">
          <CardHeader><CardTitle>Your data</CardTitle><CardDescription>{counts.w} workflows · {counts.p} plans · {counts.m} measurements. No hidden tracking, screen recording or access to other apps.</CardDescription></CardHeader>
          <CardContent>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete my workflow data</Button>
          </CardContent>
        </Card>
      </div>

      <Modal open={confirmDelete} onOpenChange={setConfirmDelete}>
        <ModalContent title="Delete all your workflow data?" description={isCloudSync() ? "Removes workflows, analyses, plans and measurements from this device and your account. Submitted anonymous feedback is not linked to you and isn't affected." : "Removes workflows, analyses, plans and measurements stored in this browser."}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={deleteAll}><Trash2 /> Delete everything</Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
