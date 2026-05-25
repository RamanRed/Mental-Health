import { Activity, ClipboardPlus, LayoutDashboard, Users } from "lucide-react";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

export async function Sidebar({ area }: { area: "doctor" | "asha" }) {
  const locale = (await getLocale()) as SiteLocale;
  const copy = siteCopy[locale] ?? siteCopy.en;
  const items = area === "doctor"
    ? [{ href: "/doctor/dashboard", label: copy.nav.dashboard, icon: LayoutDashboard }, { href: "/doctor/patients", label: copy.nav.patients, icon: Users }]
    : [{ href: "/asha/dashboard", label: copy.nav.dashboard, icon: LayoutDashboard }, { href: "/asha/register-patient", label: copy.nav.registerPatient, icon: ClipboardPlus }];
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white p-4 dark:bg-card md:block">
      <Link href="/" className="mb-8 block text-xl font-black text-primary">MindBridge</Link>
      <nav className="space-y-2" aria-label={copy.nav.sidebar}>
        {items.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted"><item.icon className="h-5 w-5" />{item.label}</Link>)}
      </nav>
      <div className="mt-8 rounded-lg bg-teal-50 p-3 text-sm text-teal-900"><Activity className="mb-2 h-5 w-5" />{copy.nav.calmMode}</div>
    </aside>
  );
}
