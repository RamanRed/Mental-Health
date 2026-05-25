"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ChatError({ reset }: { reset: () => void }) {
  const t = useTranslations("chat");
  return <main className="grid min-h-[70vh] place-items-center px-4"><div className="max-w-md text-center"><h1 className="text-2xl font-black">{t("errorTitle")}</h1><p className="mt-2 text-muted-foreground">{t("errorBody")}</p><Button className="mt-5" onClick={reset}>{t("tryAgain")}</Button></div></main>;
}
