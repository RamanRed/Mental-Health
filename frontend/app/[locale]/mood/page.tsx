import { getTranslations } from "next-intl/server";
import { MoodCheckInForm } from "@/components/forms/MoodCheckInForm";
import { Card } from "@/components/ui/card";

export default async function MoodPage() {
  const t = await getTranslations("forms.mood");
  return <main className="mx-auto max-w-xl px-4 py-8"><Card><h1 className="mb-6 text-2xl font-black">{t("title")}</h1><MoodCheckInForm /></Card></main>;
}
