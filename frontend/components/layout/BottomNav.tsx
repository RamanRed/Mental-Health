"use client";

import { Bot, Calendar, ClipboardList, Home, PenLine } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

export function BottomNav() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const pathname = usePathname();

  if (pathname === "/") return null;

  const items = [
    { href: "/dashboard", label: copy.nav.dashboard, icon: Home },
    { href: "/chat", label: copy.nav.chat, icon: Bot },
    { href: "/journal", label: copy.nav.journal, icon: PenLine },
    { href: "/assessments", label: copy.nav.assessments, icon: ClipboardList },
    { href: "/appointments", label: copy.nav.appointments, icon: Calendar },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white safe-bottom dark:bg-card md:hidden" aria-label={copy.nav.mobile}>
      <div className="grid grid-cols-5">
        {items.map((item) => <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold text-muted-foreground"><item.icon className="h-5 w-5" aria-hidden="true" />{item.label}</Link>)}
      </div>
    </nav>
  );
}

