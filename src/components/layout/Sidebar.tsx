"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  Trophy,
  Target,
  MessageCircleHeart,
  Waves,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/training", label: "Training", icon: Activity },
  { href: "/health", label: "Gesundheit", icon: HeartPulse },
  { href: "/competitions", label: "Wettkämpfe", icon: Trophy },
  { href: "/goals", label: "Ziele", icon: Target },
  { href: "/coach", label: "KI-Coach", icon: MessageCircleHeart },
];

export function Sidebar({ freshnessLabel }: { freshnessLabel?: string }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-surface/60 px-4 py-6 shrink-0">
      <div className="flex items-center gap-2 px-2 mb-8">
        <Waves className="text-accent" size={24} />
        <span className="text-lg font-semibold tracking-tight">Sportlog</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 text-xs text-muted space-y-1">
        <div>Rudersport &middot; KI-gestützt</div>
        {freshnessLabel && <div className="text-muted/70">{freshnessLabel}</div>}
      </div>
    </aside>
  );
}
