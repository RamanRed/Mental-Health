import { getTranslations } from "next-intl/server";
import { JournalForm } from "@/components/forms/JournalForm";
import { Card } from "@/components/ui/card";

export default async function JournalPage() {
  const t = await getTranslations("forms.journal");
  return <main className="mx-auto max-w-2xl px-4 py-8"><Card><h1 className="mb-6 text-2xl font-black">{t("title")}</h1><JournalForm /></Card></main>;
}
