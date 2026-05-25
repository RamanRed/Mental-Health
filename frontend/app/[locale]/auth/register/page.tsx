"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { dashboardForRole, withLocalePath } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/), role: z.enum(["patient", "doctor", "asha_worker"]), language: z.enum(["en", "hi", "kn", "ta", "mr"]) });

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const locale = useLocale();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { phone: "+91", role: "patient", language: locale as "en" } });
  return (
    <main className="mx-auto max-w-md px-4 py-10"><Card><h1 className="mb-6 text-2xl font-black">{t("title")}</h1>
      <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => { const response = await authApi.register(values); setAuth({ user: response.data.data.user, token: response.data.data.accessToken }); router.push(withLocalePath(locale, dashboardForRole(response.data.data.user.role))); })}>
        <Input aria-label={t("phone")} placeholder={t("phone")} {...form.register("phone")} />
        <select aria-label={t("role")} className="h-11 w-full rounded-lg border bg-white px-3 dark:bg-card" {...form.register("role")}><option value="patient">{t("patient")}</option><option value="doctor">{t("doctor")}</option><option value="asha_worker">{t("asha")}</option></select>
        <Button className="w-full" type="submit">{t("submit")}</Button>
      </form>
    </Card></main>
  );
}
