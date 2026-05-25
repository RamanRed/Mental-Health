import { Bot, ClipboardList, PenLine, SmilePlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MoodTrendChart } from "@/components/charts/MoodTrendChart";
import { AnonymousPill } from "@/components/ui/AnonymousPill";
import { Card } from "@/components/ui/card";
import { MoodCircle } from "@/components/ui/MoodCircle";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { Link } from "@/i18n/routing";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const actions = [{ href: "/chat", label: t("chat"), icon: Bot }, { href: "/journal", label: t("journal"), icon: PenLine }, { href: "/mood", label: t("mood"), icon: SmilePlus }, { href: "/assessments", label: t("assessments"), icon: ClipboardList }];
  const data = [{ day: "M", mood: 5 }, { day: "T", mood: 6 }, { day: "W", mood: 4 }, { day: "T", mood: 7 }, { day: "F", mood: 7 }, { day: "S", mood: 8 }, { day: "S", mood: 6 }];
  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-3">
      <section className="space-y-4 md:col-span-2">
        <div className="space-y-2"><AnonymousPill id="CalmRiver42" label={t("chattingAs")} /><h1 className="text-3xl font-black">{t("greeting")}</h1></div>
        <Card className="flex items-center justify-between"><div><h2 className="text-lg font-bold">{t("todayMood")}</h2><p className="text-sm text-muted-foreground">{t("moodPrompt")}</p></div><MoodCircle value={6} label={t("mood")} /></Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{actions.map((action) => <Link key={action.href} href={action.href} className="rounded-lg border bg-white p-4 text-sm font-bold shadow-soft hover:border-primary dark:bg-card"><action.icon className="mb-3 h-6 w-6 text-primary" />{action.label}</Link>)}</div>
        <Card><h2 className="mb-3 text-lg font-bold">{t("trend")}</h2><MoodTrendChart data={data} /></Card>
      </section>
      <aside className="space-y-4">
        <Card><StreakDisplay count={5} label={t("days")} badges={[t("badge")]} /></Card>
        <Card className="space-y-3"><h2 className="font-bold">{t("risk")}</h2><RiskBadge level="green" label={t("green")} /></Card>
        <Card><h2 className="font-bold">{t("appointment")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("noAppointment")}</p></Card>
      </aside>
    </main>
  );
}
