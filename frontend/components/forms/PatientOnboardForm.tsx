"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/ChipSelect";
import { Input } from "@/components/ui/input";
import { SliderInput } from "@/components/ui/SliderInput";
import { Stepper } from "@/components/ui/Stepper";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { patientApi } from "@/lib/api";

const schema = z.object({
  name: z.string().optional(),
  age: z.coerce.number().min(5).max(100).optional(),
  gender: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  language: z.string().optional(),
  occupation: z.string().optional(),
  abha_id: z.string().optional(),
  sleep_quality: z.coerce.number().min(1).max(10).default(6),
  sleep_hours_avg: z.coerce.number().min(1).max(12).default(7),
  stress: z.coerce.number().min(1).max(10).default(5),
  activity: z.string().optional(),
  diet: z.string().optional(),
  social_support: z.string().optional(),
  work_life_balance: z.coerce.number().min(1).max(10).default(5),
  energy: z.coerce.number().min(1).max(10).default(5),
  motivation: z.coerce.number().min(1).max(10).default(5),
  focus_difficulty: z.boolean().optional(),
  emotional_state: z.array(z.string()).default([]),
  recent_life_event: z.string().optional(),
  previous_therapy: z.boolean().optional(),
  consent_terms: z.boolean().refine(Boolean),
  consent_health: z.boolean().refine(Boolean),
});

type Values = z.infer<typeof schema>;

export function PatientOnboardForm({ step }: { step: number }) {
  const t = useTranslations("onboard");
  const locale = useLocale();
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { sleep_quality: 6, sleep_hours_avg: 7, stress: 5, work_life_balance: 5, energy: 5, motivation: 5, emotional_state: [], language: locale, consent_terms: false, consent_health: false },
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("mindbridge-onboard-draft");
    if (saved) form.reset({ ...form.getValues(), ...JSON.parse(saved) });
  }, [form]);

  function persistDraft() {
    sessionStorage.setItem("mindbridge-onboard-draft", JSON.stringify(form.getValues()));
  }

  async function onSubmit(values: Values) {
    persistDraft();
    if (step < 3) {
      router.push(`/${locale}/onboard/${step + 1}`);
      return;
    }
    await patientApi.onboard(values);
    sessionStorage.removeItem("mindbridge-onboard-draft");
    router.push(`/${locale}/dashboard`);
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Stepper current={step} total={3} label={t("progress")} />
      {step === 1 ? (
        <div className="grid gap-4">
          {(["name", "age", "gender", "state", "district", "language", "occupation", "abha_id"] as const).map((field) => (
            <div key={field} className="space-y-2">
              <label className="text-sm font-semibold" htmlFor={field}>{t(`fields.${field}`)}</label>
              <Input id={field} type={field === "age" ? "number" : "text"} {...form.register(field)} />
              {form.formState.errors[field] ? <p className="text-sm text-danger">{t("fieldError")}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-5">
          <Controller control={form.control} name="sleep_quality" render={({ field }) => <SliderInput label={t("fields.sleep_quality")} value={field.value} onChange={field.onChange} />} />
          <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="sleep_hours_avg">{t("fields.sleep_hours_avg")}</label><Input id="sleep_hours_avg" type="number" {...form.register("sleep_hours_avg")} /></div>
          <Controller control={form.control} name="stress" render={({ field }) => <SliderInput label={t("fields.stress")} value={field.value} onChange={field.onChange} />} />
          {(["activity", "diet", "social_support"] as const).map((field) => <div key={field} className="space-y-2"><label className="text-sm font-semibold" htmlFor={field}>{t(`fields.${field}`)}</label><Input id={field} {...form.register(field)} /></div>)}
          <Controller control={form.control} name="work_life_balance" render={({ field }) => <SliderInput label={t("fields.work_life_balance")} value={field.value} onChange={field.onChange} />} />
        </div>
      ) : null}
      {step === 3 ? (
        <div className="grid gap-5">
          <Controller control={form.control} name="energy" render={({ field }) => <SliderInput label={t("fields.energy")} value={field.value} onChange={field.onChange} />} />
          <Controller control={form.control} name="motivation" render={({ field }) => <SliderInput label={t("fields.motivation")} value={field.value} onChange={field.onChange} />} />
          <Controller control={form.control} name="focus_difficulty" render={({ field }) => <ToggleGroup label={t("fields.focus_difficulty")} yes={t("yes")} no={t("no")} value={field.value} onChange={field.onChange} />} />
          <Controller control={form.control} name="emotional_state" render={({ field }) => <ChipSelect label={t("fields.emotional_state")} options={t.raw("emotionOptions")} value={field.value} onChange={field.onChange} />} />
          <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="recent_life_event">{t("fields.recent_life_event")}</label><Input id="recent_life_event" {...form.register("recent_life_event")} /></div>
          <Controller control={form.control} name="previous_therapy" render={({ field }) => <ToggleGroup label={t("fields.previous_therapy")} yes={t("yes")} no={t("no")} value={field.value} onChange={field.onChange} />} />
          <label className="flex gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 accent-primary" {...form.register("consent_terms")} />{t("consentTerms")}</label>
          <label className="flex gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 accent-primary" {...form.register("consent_health")} />{t("consentHealth")}</label>
          {(form.formState.errors.consent_terms || form.formState.errors.consent_health) ? <p className="text-sm text-danger">{t("consentError")}</p> : null}
        </div>
      ) : null}
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting} onClick={persistDraft}>
        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {step < 3 ? t("continue") : t("finish")}
      </Button>
    </form>
  );
}
