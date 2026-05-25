import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  return <main className="mx-auto max-w-5xl px-4 py-8"><h1 className="mb-6 text-3xl font-black">{t("title")}</h1><div className="grid gap-4 md:grid-cols-3"><Card>{t("users")}</Card><Card>{t("alerts")}</Card><Card>{t("uptime")}</Card></div></main>;
}
