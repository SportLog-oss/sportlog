"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, Dumbbell, HeartPulse, Home, MoreHorizontal, Sparkles, TrendingUp, UserCircle } from "lucide-react";
import { QuickAddModal } from "./QuickAddModal";

const MAIN_ITEMS = [
  { href: "/", label: "Heute", icon: Home },
  { href: "/planung", label: "Plan", icon: CalendarDays },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/health", label: "Gesundheit", icon: HeartPulse },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  if (pathname === "/login") return null;
  const secondaryActive = ["/erfolg", "/coach", "/profil"].includes(pathname);

  return (
    <>
      {moreOpen && <div className="fixed inset-0 z-40 bg-black/45 md:hidden" onClick={() => setMoreOpen(false)} />}
      {moreOpen && (
        <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-3 shadow-2xl md:hidden">
          <MoreLink href="/erfolg" label="Erfolg" icon={TrendingUp} onClick={() => setMoreOpen(false)} />
          <MoreLink href="/coach" label="KI-Coach" icon={Sparkles} onClick={() => setMoreOpen(false)} />
          <MoreLink href="/profil" label="Profil" icon={UserCircle} onClick={() => setMoreOpen(false)} />
          <button onClick={() => { setMoreOpen(false); setHealthOpen(true); }} className="flex items-center gap-3 rounded-xl bg-surface-raised px-3 py-3 text-left text-sm font-medium"><HeartPulse size={19} className="text-accent" /> Befinden</button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {MAIN_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={clsx("flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-accent" : "text-muted")}><Icon size={21} strokeWidth={active ? 2.2 : 1.8} />{label}</Link>;
        })}
        <button onClick={() => setMoreOpen((open) => !open)} className={clsx("flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium", secondaryActive || moreOpen ? "text-accent" : "text-muted")}><MoreHorizontal size={22} />Mehr</button>
      </nav>
      <QuickAddModal open={healthOpen} onClose={() => setHealthOpen(false)} />
    </>
  );
}

function MoreLink({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: typeof Home; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-xl bg-surface-raised px-3 py-3 text-sm font-medium"><Icon size={19} className="text-accent" />{label}</Link>;
}
