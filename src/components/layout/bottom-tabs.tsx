"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Beaker, Gauge, LayoutGrid, PlayCircle, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav";

const TABS = [
  { href: "/", label: "Home", icon: Gauge },
  { href: "/analyze", label: "Analyze", icon: ScanSearch },
  { href: "/demo", label: "Demo", icon: PlayCircle, center: true },
  { href: "/lab", label: "Lab", icon: Beaker },
];

/** Phone-only app tab bar. "More" opens the full navigation sheet. */
export function BottomTabs({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const inMore = !moreOpen && !TABS.some((t) => isActive(t.href)) && [...PRIMARY_NAV, ...SECONDARY_NAV].some((n) => isActive(n.href));

  return (
    <nav
      aria-label="App tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {TABS.map((t) => {
          const active = isActive(t.href);
          const Icon = t.icon;
          if (t.center)
            return (
              <li key={t.href} className="flex justify-center">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className="-mt-7 flex flex-col items-center gap-1 text-[10px] font-medium"
                >
                  <span className={cn("grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan to-royal text-night shadow-[0_10px_30px_-8px_rgb(0_217_255/0.7)] ring-4 ring-night transition-transform active:scale-95", active && "from-cyan to-violet")}>
                    <Icon className="size-6" />
                  </span>
                  <span className={active ? "text-cyan" : "text-muted"}>{t.label}</span>
                </Link>
              </li>
            );
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-1 py-2 text-[10px] font-medium active:scale-95">
                {active && <motion.span layoutId="tab-dot" className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-cyan" />}
                <Icon className={cn("size-[22px]", active ? "text-cyan" : "text-subtle")} />
                <span className={active ? "text-ink" : "text-muted"}>{t.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button onClick={onMore} aria-expanded={moreOpen} className="relative flex w-full flex-col items-center gap-1 py-2 text-[10px] font-medium active:scale-95">
            {inMore && <span className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-cyan" />}
            <LayoutGrid className={cn("size-[22px]", moreOpen || inMore ? "text-cyan" : "text-subtle")} />
            <span className={moreOpen || inMore ? "text-ink" : "text-muted"}>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
