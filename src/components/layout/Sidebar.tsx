"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, Dumbbell, HeartPulse, Home, TrendingUp, UserCircle, Waves } from "lucide-react";
import { QuickAddModal } from "./QuickAddModal";

const NAV_ITEMS = [
  { href: "/", label: "Heute", icon: Home },
  { href: "/planung", label: "Plan", icon: CalendarDays },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/health", label: "Gesundheit", icon: HeartPulse },
  { href: "/erfolg", label: "Erfolg", icon: TrendingUp },
  { href: "/profil", label: "Profil", icon: UserCircle, separated: true },
];

export function Sidebar({ freshnessLabel }: { freshnessLabel?: string }) {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  if (pathname === "/login") return null;

  return (
    <aside className="hidden shrink-0 border-r border-border bg-surface/60 px-4 py-6 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:self-start">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Waves className="text-accent" size={28} />
        <span className="text-xl font-semibold tracking-tight">SportLog</span>
        <button onClick={() => setQuickAddOpen(true)} aria-label="Befinden erfassen" title="Befinden erfassen" className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-accent/40 hover:text-accent">
          <HeartPulse size={16} />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, separated }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg border-l-2 px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-accent bg-gradient-to-r from-accent-soft to-transparent text-accent"
                  : "border-transparent text-muted hover:bg-surface-raised hover:text-foreground",
                separated && "mt-4 border-t border-t-border pt-5"
              )}
            >
              <Icon size={19} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 px-2 text-xs text-muted">
        <div>Leistungssport &middot; KI-gestützt</div>
        {freshnessLabel && <div className="text-muted/70">{freshnessLabel}</div>}
      </div>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </aside>
  );
}
