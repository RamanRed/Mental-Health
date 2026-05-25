"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { doctorApi } from "@/lib/api";

const schema = z.object({ appointment_id: z.string().min(1), patient_id: z.string().min(1), chief_complaint: z.string().min(5).max(1000), mental_status_exam: z.string().min(5), diagnosis_provisional: z.string().min(2), risk_assessment: z.enum(["green", "yellow", "orange", "red"]), plan: z.string().min(5), medication_prescribed: z.string().optional(), followup_in_days: z.coerce.number().min(1).max(365).optional(), emergency_escalation: z.boolean().default(false) });

export function ClinicalNotesForm() {
  const t = useTranslations("forms.clinical");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { risk_assessment: "green", emergency_escalation: false } });
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => doctorApi.clinicalNotes(values))}>
      <Input aria-label={t("appointment")} placeholder={t("appointment")} {...form.register("appointment_id")} />
      <Input aria-label={t("patient")} placeholder={t("patient")} {...form.register("patient_id")} />
      <Textarea aria-label={t("complaint")} placeholder={t("complaint")} {...form.register("chief_complaint")} />
      <Textarea aria-label={t("mse")} placeholder={t("mse")} {...form.register("mental_status_exam")} />
      <Input aria-label={t("diagnosis")} placeholder={t("diagnosis")} {...form.register("diagnosis_provisional")} />
      <select aria-label={t("risk")} className="h-11 rounded-lg border bg-white px-3 dark:bg-card" {...form.register("risk_assessment")}><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option></select>
      <Textarea aria-label={t("plan")} placeholder={t("plan")} {...form.register("plan")} />
      <Input aria-label={t("medication")} placeholder={t("medication")} {...form.register("medication_prescribed")} />
      <Input aria-label={t("followup")} type="number" placeholder={t("followup")} {...form.register("followup_in_days")} />
      <label className="flex gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" {...form.register("emergency_escalation")} />{t("emergency")}</label>
      <Button type="submit">{t("save")}</Button>
    </form>
  );
}
