import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function CommunityPage() {
  const t = await getTranslations("community");
  return <main className="mx-auto max-w-3xl px-4 py-8"><Card><h1 className="text-2xl font-black">{t("title")}</h1><p className="mt-3 text-muted-foreground">{t("body")}</p></Card></main>;
}
