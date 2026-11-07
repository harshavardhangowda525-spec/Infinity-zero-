"use client";
import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = {
  standalone: boolean; // already running as an installed app
  canPrompt: boolean; // browser offers a native install prompt (Android / desktop Chrome, Edge)
  ios: boolean; // iPhone/iPad Safari: install via Share → Add to Home Screen
  install: () => Promise<boolean>;
};

const InstallContext = React.createContext<InstallState>({ standalone: false, canPrompt: false, ios: false, install: async () => false });
export const useInstall = () => React.useContext(InstallContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const deferred = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = React.useState(false);
  const [standalone, setStandalone] = React.useState(false);
  const [ios, setIos] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () => mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone());
    document.documentElement.dataset.standalone = String(isStandalone());
    const onMode = () => {
      setStandalone(isStandalone());
      document.documentElement.dataset.standalone = String(isStandalone());
    };
    mq.addEventListener("change", onMode);

    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setCanPrompt(false);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      mq.removeEventListener("change", onMode);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = React.useCallback(async () => {
    const e = deferred.current;
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    deferred.current = null;
    setCanPrompt(false);
    return outcome === "accepted";
  }, []);

  return <InstallContext.Provider value={{ standalone, canPrompt, ios, install }}>{children}</InstallContext.Provider>;
}
