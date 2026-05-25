import { ClipboardPlus, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export default async function AshaDashboardPage() {
  const t = await getTranslations("asha");
  return <div className="flex"><Sidebar area="asha" /><main className="flex-1 px-4 py-8"><h1 className="mb-6 text-3xl font-black">{t("dashboard")}</h1><div className="grid gap-4 md:grid-cols-2"><Card><Users className="mb-2 h-6 w-6 text-primary" />{t("registered")}: 46</Card><Link href="/asha/register-patient"><Card className="hover:border-primary"><ClipboardPlus className="mb-2 h-6 w-6 text-accent" />{t("register")}</Card></Link></div></main></div>;
}
