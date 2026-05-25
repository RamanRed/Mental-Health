import { getTranslations } from "next-intl/server";
import { AshaScreeningForm } from "@/components/forms/AshaScreeningForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";

export default async function AshaScreeningPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("asha");
  return <div className="flex"><Sidebar area="asha" /><main className="flex-1 px-4 py-8"><Card className="mx-auto max-w-xl"><h1 className="mb-6 text-2xl font-black">{t("screening")}</h1><AshaScreeningForm patientId={params.id} /></Card></main></div>;
}
