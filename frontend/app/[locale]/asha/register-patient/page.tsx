import { getTranslations } from "next-intl/server";
import { AshaPatientRegForm } from "@/components/forms/AshaPatientRegForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";

export default async function AshaRegisterPatientPage() {
  const t = await getTranslations("asha");
  return <div className="flex"><Sidebar area="asha" /><main className="flex-1 px-4 py-8"><Card className="mx-auto max-w-xl"><h1 className="mb-6 text-2xl font-black">{t("register")}</h1><AshaPatientRegForm /></Card></main></div>;
}
