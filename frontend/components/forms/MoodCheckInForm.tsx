"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/ChipSelect";
import { SliderInput } from "@/components/ui/SliderInput";
import { Textarea } from "@/components/ui/textarea";
import { patientApi } from "@/lib/api";

const schema = z.object({
  mood_score: z.number().min(1).max(10),
  energy: z.number().min(1).max(10),
  anxiety_level: z.number().min(1).max(10),
  sleep_last_night: z.number().min(1).max(12),
  note: z.string().max(500).optional(),
  tags: z.array(z.string()),
});

export function MoodCheckInForm() {
  const t = useTranslations("forms.mood");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { mood_score: 6, energy: 6, anxiety_level: 4, sleep_last_night: 7, tags: [] } });
  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => patientApi.logMood({ ...values, mood_emoji: "neutral", logged_at: new Date().toISOString() }))}>
      <Controller control={form.control} name="mood_score" render={({ field }) => <SliderInput label={t("mood")} value={field.value} onChange={field.onChange} />} />
      <Controller control={form.control} name="energy" render={({ field }) => <SliderInput label={t("energy")} value={field.value} onChange={field.onChange} />} />
      <Controller control={form.control} name="anxiety_level" render={({ field }) => <SliderInput label={t("anxiety")} value={field.value} onChange={field.onChange} />} />
      <Controller control={form.control} name="sleep_last_night" render={({ field }) => <SliderInput label={t("sleep")} value={field.value} onChange={field.onChange} min={1} max={12} />} />
      <Controller control={form.control} name="tags" render={({ field }) => <ChipSelect label={t("tags")} options={t.raw("tagOptions")} value={field.value} onChange={field.onChange} />} />
      <Textarea aria-label={t("note")} placeholder={t("note")} {...form.register("note")} />
      <Button type="submit" className="w-full">{t("submit")}</Button>
    </form>
  );
}
