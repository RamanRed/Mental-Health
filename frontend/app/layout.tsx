import type { Metadata } from "next";
import { Noto_Sans, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  variable: "--font-noto",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saathi — Compassionate Multilingual Mental Wellness",
  description:
    "AI-powered multilingual emotional wellness assistance for rural and underserved communities. Available in Hindi, Marathi, and English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
