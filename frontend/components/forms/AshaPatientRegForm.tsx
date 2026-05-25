"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { ashaApi } from "@/lib/api";

const schema = z.object({ patient_name: z.string().min(2), age: z.coerce.number().min(5).max(100), gender: z.string(), village: z.string().min(1), district: z.string().min(1), state: z.string().min(1), literacy_level: z.string(), has_smartphone: z.boolean() });

export function AshaPatientRegForm() {
  const t = useTranslations("forms.ashaReg");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { has_smartphone: false, literacy_level: "basic" } });
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => ashaApi.registerPatient(values))}>
      {(["patient_name", "age", "gender", "village", "district", "state", "literacy_level"] as const).map((field) => <Input key={field} aria-label={t(field)} placeholder={t(field)} type={field === "age" ? "number" : "text"} {...form.register(field)} />)}
      <ToggleGroup label={t("has_smartphone")} yes={t("yes")} no={t("no")} value={form.watch("has_smartphone")} onChange={(value) => form.setValue("has_smartphone", value)} />
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}
