"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { patientApi } from "@/lib/api";

const schema = z.object({ content: z.string().min(10).max(4000) });

export function JournalForm() {
  const t = useTranslations("forms.journal");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { content: "" } });
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit((values) => patientApi.journal(values).then(() => form.reset()))}>
      <Textarea rows={8} aria-label={t("content")} placeholder={t("placeholder")} {...form.register("content")} />
      {form.formState.errors.content ? <p className="text-sm text-danger">{t("error")}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>{t("save")}</Button>
    </form>
  );
}
