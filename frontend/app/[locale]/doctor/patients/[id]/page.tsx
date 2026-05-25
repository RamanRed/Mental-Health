import { getTranslations } from "next-intl/server";
import { ClinicalNotesForm } from "@/components/forms/ClinicalNotesForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { MoodTrendChart } from "@/components/charts/MoodTrendChart";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/RiskBadge";

export default async function DoctorPatientDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("doctor");
  return <div className="flex"><Sidebar area="doctor" /><main className="flex-1 space-y-4 px-4 py-8"><div className="flex items-center justify-between"><h1 className="text-3xl font-black">{params.id}</h1><RiskBadge level="orange" label={t("orange")} /></div><Card><h2 className="mb-3 font-bold">{t("moodTrend")}</h2><MoodTrendChart data={[{ day: "M", mood: 5 }, { day: "T", mood: 6 }, { day: "W", mood: 4 }]} /></Card><Card><h2 className="mb-4 font-bold">{t("clinicalNotes")}</h2><ClinicalNotesForm /></Card></main></div>;
}
