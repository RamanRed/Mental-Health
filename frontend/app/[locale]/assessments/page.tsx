"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AQ10Screener } from "@/components/screeners/AQ10Screener";
import { ASRSScreener } from "@/components/screeners/ASRSScreener";
import { GAD7Screener } from "@/components/screeners/GAD7Screener";
import { MDQScreener } from "@/components/screeners/MDQScreener";
import { PHQ9Screener } from "@/components/screeners/PHQ9Screener";
import { AssessmentCard } from "@/components/ui/AssessmentCard";

export default function AssessmentsPage() {
  const t = useTranslations("assessments");
  const [active, setActive] = useState("PHQ9");
  const cards = ["PHQ9", "GAD7", "ASRS", "AQ10", "MDQ"] as const;
  const map = { PHQ9: <PHQ9Screener />, GAD7: <GAD7Screener />, ASRS: <ASRSScreener />, AQ10: <AQ10Screener />, MDQ: <MDQScreener /> };
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black">{t("title")}</h1>
      <div className="grid gap-4 md:grid-cols-5">{cards.map((id) => <AssessmentCard key={id} name={t(`${id}.name`)} description={t(`${id}.description`)} count={t(`${id}.count`)} severity={t("notTaken")} action={t("start")} onStart={() => setActive(id)} />)}</div>
      <section className="mt-6">{map[active as keyof typeof map]}</section>
    </main>
  );
}
