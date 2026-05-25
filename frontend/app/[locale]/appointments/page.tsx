import { getTranslations } from "next-intl/server";
import { AppointmentBookingForm } from "@/components/forms/AppointmentBookingForm";
import { Card } from "@/components/ui/card";

export default async function AppointmentsPage() {
  const t = await getTranslations("forms.appointment");
  return <main className="mx-auto max-w-2xl px-4 py-8"><Card><h1 className="mb-6 text-2xl font-black">{t("title")}</h1><AppointmentBookingForm /></Card></main>;
}
