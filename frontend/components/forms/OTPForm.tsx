"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { dashboardForRole, withLocalePath } from "@/lib/auth";
import { useAuthStore, type Locale } from "@/store/authStore";

const schema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/),
  otp: z.string().regex(/^\d{6}$/).optional(),
  role: z.enum(["patient", "doctor", "asha_worker", "admin"]).default("patient"),
});

type Values = z.infer<typeof schema>;

export function OTPForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [resendIn, setResendIn] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300);
  const [serverError, setServerError] = useState("");
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "+91", otp: "", role: "patient" },
  });

  useEffect(() => {
    if (step !== "otp") return;
    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
      setExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const expiry = useMemo(() => `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`, [expiresIn]);

  async function requestOtp(phone: string) {
    setServerError("");
    await authApi.sendOtp(phone);
    setStep("otp");
    setResendIn(30);
    setExpiresIn(300);
    window.setTimeout(() => boxes.current[0]?.focus(), 50);
  }

  async function onSubmit(values: Values) {
    try {
      if (step === "phone") {
        await requestOtp(values.phone);
        return;
      }
      const response = await authApi.verifyOtp({ phone: values.phone, otp: values.otp ?? "", role: values.role, language: locale as Locale });
      setAuth({ user: response.data.data.user, token: response.data.data.accessToken });
      router.push(withLocalePath(locale, dashboardForRole(response.data.data.user.role)));
    } catch {
      setServerError(t("error"));
    }
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="phone">{t("phone")}</label>
        <Input id="phone" inputMode="tel" autoComplete="tel" aria-invalid={!!form.formState.errors.phone} {...form.register("phone")} />
        {form.formState.errors.phone ? <p className="text-sm text-danger">{t("phoneError")}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="role">{t("role")}</label>
        <select id="role" className="h-11 w-full rounded-lg border bg-white px-3 dark:bg-card" {...form.register("role")}>
          <option value="patient">{t("roles.patient")}</option>
          <option value="doctor">{t("roles.doctor")}</option>
          <option value="asha_worker">{t("roles.asha")}</option>
        </select>
      </div>
      {step === "otp" ? (
        <Controller
          control={form.control}
          name="otp"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>{t("otp")}</span>
                <span>{t("expires", { time: expiry })}</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <Input
                    key={index}
                    ref={(node) => { boxes.current[index] = node; }}
                    aria-label={t("otpBox", { number: index + 1 })}
                    inputMode="numeric"
                    maxLength={1}
                    value={field.value?.[index] ?? ""}
                    onChange={(event) => {
                      const digit = event.target.value.replace(/\D/g, "").slice(-1);
                      const next = `${field.value ?? ""}`.padEnd(6, " ").split("");
                      next[index] = digit || " ";
                      field.onChange(next.join("").replace(/\s/g, ""));
                      if (digit) boxes.current[index + 1]?.focus();
                    }}
                    className="px-0 text-center text-lg font-bold"
                  />
                ))}
              </div>
              {form.formState.errors.otp ? <p className="text-sm text-danger">{t("otpError")}</p> : null}
              <Button type="button" variant="ghost" disabled={resendIn > 0 || form.formState.isSubmitting} onClick={() => requestOtp(form.getValues("phone"))}>
                {resendIn > 0 ? t("resendWait", { seconds: resendIn }) : t("resend")}
              </Button>
            </div>
          )}
        />
      ) : null}
      {serverError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{serverError}</p> : null}
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {step === "phone" ? t("send") : t("verify")}
      </Button>
    </form>
  );
}
