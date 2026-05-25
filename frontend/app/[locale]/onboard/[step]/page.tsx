import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PatientOnboardForm } from "@/components/forms/PatientOnboardForm";
import { Card } from "@/components/ui/card";

export default async function OnboardPage({ params }: { params: { step: string } }) {
  const step = Number(params.step);
  if (![1, 2, 3].includes(step)) notFound();
  const t = await getTranslations("onboard");
  return <main className="mx-auto max-w-2xl px-4 py-8"><Card><h1 className="mb-6 text-2xl font-black">{t("title")}</h1><PatientOnboardForm step={step} /></Card></main>;
}
