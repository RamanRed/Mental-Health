"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronDown,
  History,
  Languages,
  LogOut,
  Settings,
  User,
  UserCircle,
  Heart,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { siteCopy, supportedLanguages, type SiteLocale } from "@/lib/siteCopy";
import { useAuthStore } from "@/store/authStore";

/* ─── Color tokens (use CSS variables) ─── */
const C = {
  prussian: "var(--prussian)",
  teal: "var(--teal)",
  skyBlue: "var(--sky)",
  bg: "var(--sky-mist)",
  yellow: "var(--yellow)",
};

/* ─── Landing Navbar ─── */
function LandingNavbar() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { label: copy.nav.home, href: "/" },
    { label: copy.nav.about, href: "#about" },
    { label: copy.nav.features, href: "#features" },
    { label: copy.nav.blog, href: "#blog" },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: "68px",
        padding: "0 clamp(20px, 5vw, 52px)",
        background: scrolled
          ? "rgba(234,246,251,0.88)"
          : "rgba(255,255,255,0.12)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: scrolled
          ? "1px solid rgba(142,202,230,0.35)"
          : "1px solid rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "background 0.35s ease, border-color 0.35s ease",
      }}
    >
      {/* ── Brand ── */}
      <Link
        href="/"
        className="flex items-center gap-2.5 no-underline"
        aria-label="Saathi — Home"
      >
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${C.skyBlue}, ${C.teal})`,
            borderColor: "rgba(255,255,255,0.6)",
          }}
        >
          <Brain className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
        </span>
        <span
          className="font-bold text-base tracking-tight hidden sm:block"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            color: scrolled ? C.prussian : "var(--white)",
          }}
        >
          Saathi
        </span>
      </Link>

      {/* ── Nav Links ── */}
      <nav className="hidden md:flex items-center gap-1" aria-label="Site navigation">
        {navLinks.map(({ label, href }) => (
          <Link
            key={label}
            href={href as "/"}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 no-underline hover:bg-white/30"
            style={{ color: scrolled ? C.prussian : "#ffffff", opacity: scrolled ? 0.75 : 0.95 }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer"
          style={{
            borderColor: scrolled ? "rgba(142,202,230,0.5)" : "rgba(255,255,255,0.18)",
            background: scrolled ? "rgba(244,250,253,0.7)" : "rgba(255,255,255,0.12)",
            color: scrolled ? C.prussian : "#ffffff",
          }}
        >
          <Languages className="h-3.5 w-3.5" style={{ color: scrolled ? C.teal : C.skyBlue }} />
          <select
            aria-label="Switch language"
            value={locale}
            onChange={(e) => {
              router.replace(pathname, { locale: e.target.value });
            }}
            className="bg-transparent border-none outline-none cursor-pointer text-xs font-semibold"
            style={{ color: scrolled ? C.prussian : "#ffffff" }}
          >
            {supportedLanguages.map((language) => (
              <option key={language.value} value={language.value} style={{ color: C.prussian }}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        {user ? (
          /* ── Authenticated: Avatar + Dropdown ── */
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setAvatarOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-200 hover:bg-white/80"
              style={{
                borderColor: scrolled ? "rgba(142,202,230,0.45)" : "rgba(255,255,255,0.2)",
                background: scrolled ? "rgba(244,250,253,0.7)" : "rgba(255,255,255,0.15)",
              }}
              aria-expanded={avatarOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.prussian})` }}
              >
                {(user as { name?: string })?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{ color: scrolled ? C.prussian : "#ffffff", transform: avatarOpen ? "rotate(180deg)" : "none" }}
              />
            </button>

            <AnimatePresence>
              {avatarOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-2 w-52 rounded-2xl border shadow-xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(20px)",
                    borderColor: "rgba(142,202,230,0.35)",
                  }}
                >
                  {[
                    { icon: UserCircle, label: copy.nav.profile, href: "/profile" },
                    { icon: Heart, label: copy.nav.wellness, href: "/dashboard" },
                    { icon: History, label: copy.nav.chatHistory, href: "/chat" },
                    { icon: Settings, label: copy.nav.settings, href: "/settings" },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link
                      key={label}
                      href={href as "/"}
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium no-underline hover:bg-white/80 transition-all"
                      style={{ color: C.prussian }}
                    >
                      <Icon className="h-4 w-4" style={{ color: C.teal }} />
                      {label}
                    </Link>
                  ))}
                  <div
                    className="border-t"
                    style={{ borderColor: "rgba(142,202,230,0.25)" }}
                  />
                  <button
                    onClick={() => { clearAuth(); setAvatarOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-red-50/60 transition-all"
                    style={{ color: "#c0392b" }}
                  >
                    <LogOut className="h-4 w-4" />
                    {copy.nav.signOut}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* ── Unauthenticated: Login/Signup ── */
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-sm font-medium no-underline transition-all duration-200 hover:bg-white/30"
              style={{ color: scrolled ? C.prussian : "#ffffff", opacity: scrolled ? 0.75 : 0.95 }}
            >
              {copy.nav.signIn}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold no-underline transition-all duration-200 hover:bg-[#1B87A0] hover:scale-105 hover:shadow-lg"
              style={{
                background: "#219EBC",
                color: "#ffffff",
                boxShadow: "0 3px 14px rgba(33,158,188,0.35)",
              }}
            >
              <User className="h-3.5 w-3.5" />
              {copy.nav.getStarted}
            </Link>
          </div>
        )}
      </div>
    </motion.header>
  );
}

/* ─── App / Dashboard Navbar ─── */
function AppNavbar() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: "rgba(244,250,253,0.95)",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(142,202,230,0.3)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 no-underline"
          aria-label="Saathi Home"
        >
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: `linear-gradient(135deg, ${C.skyBlue}, ${C.teal})` }}
          >
            <Brain className="h-3.5 w-3.5 text-white" />
          </span>
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "var(--font-playfair)", color: C.prussian }}
          >
            Saathi
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          {[
            { label: copy.nav.dashboard, href: "/dashboard" },
            { label: copy.nav.chat, href: "/chat" },
            { label: copy.nav.assessments, href: "/assessments" },
            { label: copy.nav.appointments, href: "/appointments" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href as "/"}
              className="no-underline transition-opacity hover:opacity-100"
              style={{ color: C.prussian, opacity: 0.65 }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <select
            aria-label="Switch language"
            value={locale}
            onChange={(e) => {
              router.replace(pathname, { locale: e.target.value });
            }}
            className="text-xs rounded-lg border px-2 py-1.5 outline-none"
            style={{
              borderColor: "rgba(142,202,230,0.5)",
              color: C.prussian,
              background: "white",
            }}
          >
            {supportedLanguages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
          <button
            onClick={clearAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-red-50"
            style={{ color: "#c0392b", border: "1px solid rgba(192,57,43,0.2)" }}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">{copy.nav.signOut}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── Export: auto-selects which navbar to render ─── */
export function Navbar() {
  const pathname = usePathname();
  return pathname === "/" ? <LandingNavbar /> : <AppNavbar />;
}
