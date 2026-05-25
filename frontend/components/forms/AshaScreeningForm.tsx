"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ashaApi } from "@/lib/api";

const schema = z.object({ tool_used: z.string().min(1), score: z.coerce.number().min(0).max(100), notes: z.string().optional() });

export function AshaScreeningForm({ patientId }: { patientId: string }) {
  const t = useTranslations("forms.ashaScreen");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { tool_used: "PHQ9", score: 0 } });
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => ashaApi.screening(patientId, values))}>
      <Input aria-label={t("tool")} placeholder={t("tool")} {...form.register("tool_used")} />
      <Input aria-label={t("score")} type="number" {...form.register("score")} />
      <Textarea aria-label={t("notes")} placeholder={t("notes")} {...form.register("notes")} />
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}
