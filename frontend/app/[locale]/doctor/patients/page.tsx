import { getTranslations } from "next-intl/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export default async function DoctorPatientsPage() {
  const t = await getTranslations("doctor");
  return <div className="flex"><Sidebar area="doctor" /><main className="flex-1 px-4 py-8"><h1 className="mb-6 text-3xl font-black">{t("patients")}</h1><div className="grid gap-3">{["CalmRiver42", "BrightHill19", "QuietLake11"].map((id) => <Link key={id} href={`/doctor/patients/${id}`}><Card className="hover:border-primary"><p className="font-bold">{id}</p><p className="text-sm text-muted-foreground">{t("lastSeen")}</p></Card></Link>)}</div></main></div>;
}
