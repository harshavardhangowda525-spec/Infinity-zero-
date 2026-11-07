"use client";
import * as React from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { actions, loadFromCloud, setCloudSync, useAppState } from "@/lib/store";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface AppStatus {
  loaded: boolean;
  aiProviders: { id: string; name: string; model: string }[];
  supabase: boolean;
  founderPasscode: boolean;
  userEmail: string | null;
}

const StatusContext = React.createContext<AppStatus>({ loaded: false, aiProviders: [], supabase: false, founderPasscode: false, userEmail: null });
export const useStatus = () => React.useContext(StatusContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const motion = useAppState((s) => s.settings.motion);
  const [status, setStatus] = React.useState<AppStatus>({ loaded: false, aiProviders: [], supabase: false, founderPasscode: false, userEmail: null });

  React.useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => !cancelled && setStatus((p) => ({ ...p, ...s, loaded: true })))
      .catch(() => !cancelled && setStatus((p) => ({ ...p, loaded: true })));

    const supabase = getBrowserSupabase();
    if (!supabase) return () => void (cancelled = true);
    const apply = (email: string | null) => {
      setCloudSync(Boolean(email));
      setStatus((p) => ({ ...p, userEmail: email }));
      if (email) void loadFromCloud();
    };
    supabase.auth.getUser().then(({ data }) => apply(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user?.email ?? null));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <StatusContext.Provider value={status}>
      <MotionConfig reducedMotion={motion === "reduced" ? "always" : motion === "full" ? "never" : "user"}>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{ style: { background: "#0b1122", border: "1px solid rgb(148 163 196 / 0.2)", color: "#eef2ff" } }}
        />
      </MotionConfig>
    </StatusContext.Provider>
  );
}

// re-export for convenience
export { actions };
