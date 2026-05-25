"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientApi } from "@/lib/api";

const schema = z.object({
  doctor_id: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  mode: z.enum(["video", "phone", "in_person"]),
  chief_complaint: z.string().min(5).max(500),
  consent_share_history: z.boolean().refine(Boolean),
});

export function AppointmentBookingForm() {
  const t = useTranslations("forms.appointment");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { mode: "phone", consent_share_history: false } });
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => patientApi.createAppointment(values))}>
      <Input aria-label={t("doctor")} placeholder={t("doctor")} {...form.register("doctor_id")} />
      <Input aria-label={t("date")} type="date" {...form.register("date")} />
      <Input aria-label={t("time")} type="time" {...form.register("time")} />
      <select aria-label={t("mode")} className="h-11 rounded-lg border bg-white px-3 dark:bg-card" {...form.register("mode")}>
        <option value="phone">{t("phone")}</option>
        <option value="video">{t("video")}</option>
        <option value="in_person">{t("inPerson")}</option>
      </select>
      <Textarea aria-label={t("complaint")} placeholder={t("complaint")} {...form.register("chief_complaint")} />
      <label className="flex gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" {...form.register("consent_share_history")} />{t("consent")}</label>
      <Button type="submit" disabled={form.formState.isSubmitting}>{t("book")}</Button>
    </form>
  );
}
