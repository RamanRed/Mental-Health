import { Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function VoiceChatPage() {
  const t = await getTranslations("chat.voicePage");
  return <main className="mx-auto max-w-xl px-4 py-10"><Card className="text-center"><Mic className="mx-auto mb-4 h-12 w-12 text-accent" /><h1 className="text-2xl font-black">{t("title")}</h1><p className="mt-2 text-muted-foreground">{t("body")}</p><button className="mt-6 h-20 w-20 rounded-full bg-primary text-white shadow-soft" aria-label={t("record")}><Mic className="mx-auto h-8 w-8" /></button></Card></main>;
}
