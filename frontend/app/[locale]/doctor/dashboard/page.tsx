import { Clock, Siren, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/RiskBadge";

export default async function DoctorDashboardPage() {
  const t = await getTranslations("doctor");
  return (
    <div className="flex"><Sidebar area="doctor" /><main className="flex-1 px-4 py-8">
      <h1 className="mb-6 text-3xl font-black">{t("dashboard")}</h1>
      <div className="grid gap-4 md:grid-cols-3"><Card><Users className="mb-2 h-6 w-6 text-primary" />{t("totalPatients")}: 128</Card><Card><Clock className="mb-2 h-6 w-6 text-accent" />{t("pending")}: 9</Card><Card><Siren className="mb-2 h-6 w-6 text-danger" />{t("alerts")}: 4</Card></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2"><Card><h2 className="mb-3 font-bold">{t("today")}</h2>{["09:30 CalmRiver42 phone confirmed", "12:00 BrightHill19 video pending"].map((item) => <p key={item} className="border-b py-3 text-sm last:border-0">{item}</p>)}</Card><Card><h2 className="mb-3 font-bold">{t("highRisk")}</h2><div className="space-y-3"><p className="flex justify-between">QuietLake11 <RiskBadge level="orange" label={t("orange")} /></p><p className="flex justify-between">CalmRiver42 <RiskBadge level="red" label={t("red")} /></p></div></Card></div>
    </main></div>
  );
}
