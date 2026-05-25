import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { OTPForm } from "@/components/forms/OTPForm";

export default async function LoginPage() {
  const t = await getTranslations("auth.login");
  return <main className="mx-auto max-w-md px-4 py-10"><Card><h1 className="mb-2 text-2xl font-black">{t("title")}</h1><p className="mb-6 text-sm text-muted-foreground">{t("subtitle")}</p><OTPForm /></Card></main>;
}
