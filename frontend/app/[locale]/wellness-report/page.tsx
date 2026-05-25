import { getTranslations } from "next-intl/server";
import { RiskHistoryChart } from "@/components/charts/RiskHistoryChart";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/RiskBadge";

export default async function WellnessReportPage() {
  const t = await getTranslations("report");
  const data = [{ day: "1", risk: 20 }, { day: "7", risk: 28 }, { day: "14", risk: 22 }, { day: "21", risk: 18 }, { day: "30", risk: 16 }];
  return <main className="mx-auto max-w-4xl px-4 py-8"><Card><div className="flex items-center justify-between"><h1 className="text-2xl font-black">{t("title")}</h1><RiskBadge level="green" label={t("green")} /></div><RiskHistoryChart data={data} /></Card></main>;
}
