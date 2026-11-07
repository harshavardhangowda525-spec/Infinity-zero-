"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav";
import { StatusPill } from "./status-pill";

function NavLinks({ items, collapsed, onNavigate }: { items: NavItem[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "bg-gradient-to-r from-cyan/15 to-royal/5 text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
                collapsed && "justify-center px-0",
              )}
            >
              {active && <motion.span layoutId={onNavigate ? "nav-m" : "nav-d"} className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan" />}
              <Icon className={cn("size-[18px] shrink-0", active ? "text-cyan" : "text-subtle group-hover:text-cyan")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
      <NavLinks items={PRIMARY_NAV} collapsed={collapsed} onNavigate={onNavigate} />
      <div>
        {!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-subtle">Validate</p>}
        <NavLinks items={SECONDARY_NAV} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("iz:sidebar") === "1");
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("iz:sidebar", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-cyan focus:px-3 focus:py-2 focus:text-night">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-night/60 backdrop-blur-xl transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
          <Link href="/" aria-label="Infinity ZERO home">
            <Logo compact={collapsed} />
          </Link>
        </div>
        <SidebarBody collapsed={collapsed} />
        <div className="border-t border-line p-3">
          <button
            onClick={toggle}
            className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ink", collapsed && "justify-center px-0")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-night/70 px-4 backdrop-blur-xl sm:px-6">
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-ink lg:hidden" aria-label="Open navigation">
              <Menu className="size-5" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-night/70 backdrop-blur-sm lg:hidden" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-line bg-night-2/95 backdrop-blur-xl lg:hidden">
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <Dialog.Description className="sr-only">Main navigation menu</Dialog.Description>
                <div className="flex h-16 items-center justify-between px-4">
                  <Logo />
                  <Dialog.Close className="rounded-lg p-2 text-muted hover:bg-white/5" aria-label="Close navigation">
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <SidebarBody onNavigate={() => setMobileOpen(false)} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Link href="/" className="lg:hidden" aria-label="Infinity ZERO home">
            <Logo compact />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <StatusPill />
            <Link href="/demo" className="hidden rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan hover:bg-cyan/20 sm:inline-flex">
              Start Live Demo
            </Link>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            id="main"
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <footer className="border-t border-line px-6 py-4 text-center text-xs text-subtle">
          Infinity ZERO is a validation prototype by Infinity Web &amp; Apps. Time savings shown are estimates unless marked as measured.
        </footer>
      </div>
    </div>
  );
}
