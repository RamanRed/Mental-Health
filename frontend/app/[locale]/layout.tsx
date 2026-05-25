import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { Navbar } from "@/components/layout/Navbar";
import { locales, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: Locale } }) {
  if (!locales.includes(params.locale)) notFound();
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <div dir="ltr" lang={params.locale} className="min-h-screen pb-20 md:pb-0">
        <Navbar />
        {children}
        <BottomNav />
      </div>
    </NextIntlClientProvider>
  );
}
