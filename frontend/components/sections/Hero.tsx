"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, Lock, MessageCircle, Mic, ShieldCheck, Sparkles, Wifi } from "lucide-react";
import { useLocale } from "next-intl";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function fadeUp(delay = 0) {
  return {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease, delay } },
  };
}

function floatY(yAmt = 10, duration = 5) {
  return {
    y: [0, -yAmt, 0],
    transition: { duration, ease: "easeInOut" as const, repeat: Infinity, repeatType: "loop" as const },
  };
}

function GlassCard({
  children,
  className = "",
  delay = 0,
  floatAmt = 8,
  floatDur = 5,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  floatAmt?: number;
  floatDur?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={fadeUp(delay)}
      animate={reduced ? undefined : floatY(floatAmt, floatDur)}
      className={`rounded-2xl border border-white/20 shadow-xl backdrop-blur-md ${className}`}
      style={{
        background: "rgba(255,255,255,0.18)",
        boxShadow: "0 8px 40px rgba(2,48,71,0.15), 0 1.5px 0 rgba(255,255,255,0.25) inset",
        color: "#ffffff",
      }}
    >
      {children}
    </motion.div>
  );
}

function Blob({
  className,
  duration = 12,
  color,
}: {
  className?: string;
  duration?: number;
  color: string;
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-40 pointer-events-none ${className}`}
      style={{ background: color }}
      animate={{ scale: [1, 1.15, 1], x: [0, 18, 0], y: [0, -14, 0] }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
    />
  );
}

export default function HeroSection() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;

  return (
    <section
      id="hero"
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{ background: "#023047" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(142,202,230,0.55), rgba(33,158,188,0.45))" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mindwell-hero.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center mix-blend-soft-light opacity-55"
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(244,250,253,0.55) 0%, transparent 70%)" }}
        />
        <Blob color="#8ECAE6" className="w-[520px] h-[520px] -top-24 -left-24" duration={14} />
        <Blob color="#219EBC" className="w-[400px] h-[400px] top-1/3 -right-16" duration={10} />
        <Blob color="#023047" className="w-[340px] h-[340px] bottom-0 left-1/4" duration={16} />
      </div>

      <motion.div
        className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-12 pt-32 pb-16 flex flex-col lg:flex-row lg:items-center gap-10 xl:gap-16 flex-1"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      >
        <div className="flex-1 flex flex-col gap-7 max-w-lg lg:max-w-xl">
          <motion.div variants={fadeUp(0)} className="flex items-center gap-2 w-fit">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#8ECAE6",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {copy.hero.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp(0.08)}
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              color: "#ffffff",
              lineHeight: 1.1,
              fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
              fontWeight: 700,
            }}
          >
            <span className="whitespace-nowrap">{copy.hero.title1}</span>
            <br />
            <em className="italic" style={{ color: "#8ECAE6" }}>{copy.hero.title2}</em>{" "}
            {copy.hero.title3}
            <br />
            {copy.hero.title4}
          </motion.h1>

          <motion.p variants={fadeUp(0.16)} style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.1rem", lineHeight: 1.75 }}>
            {copy.hero.subtitle}
          </motion.p>

          <motion.div variants={fadeUp(0.22)} className="flex flex-wrap gap-3 mt-1">
            {copy.hero.trust.map((label: string, index: number) => {
              const Icon = [ShieldCheck, Lock, Wifi][index] ?? ShieldCheck;
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#ffffff",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: "#8ECAE6" }} />
                  {label}
                </span>
              );
            })}
          </motion.div>

          <motion.div variants={fadeUp(0.28)} className="flex items-center gap-4 mt-2">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "#FFB703",
                color: "#023047",
                boxShadow: "0 4px 18px rgba(255,183,3,0.38)",
                fontFamily: "var(--font-inter)",
              }}
              aria-label={copy.hero.start}
            >
              {copy.hero.start}
              <span aria-hidden>→</span>
            </a>
            <a
              href="#about"
              className="text-sm font-medium transition-opacity hover:opacity-75"
              style={{ color: "#ffffff", textDecoration: "underline", textUnderlineOffset: "4px", opacity: 0.85 }}
            >
              {copy.hero.learn}
            </a>
          </motion.div>

          <motion.div variants={fadeUp(0.34)} className="flex items-center gap-2 text-xs mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span>{copy.hero.availableIn}</span>
            {copy.hero.languages.map((lang: string) => (
              <span
                key={lang}
                className="px-2.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  fontFamily: lang !== "English" ? "var(--font-noto)" : "inherit",
                }}
              >
                {lang}
              </span>
            ))}
          </motion.div>
        </div>

        <div className="flex-1 relative flex items-center justify-end min-h-[480px] lg:min-h-[580px] pl-4 lg:pl-10 xl:pl-16">
          <GlassCard delay={0.1} floatAmt={10} floatDur={6} className="absolute right-[18rem] top-12 w-64 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs" style={{ background: "#219EBC" }}>
                <Brain className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold" style={{ color: "#ffffff" }}>Saathi</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.25)", color: "#8ECAE6" }}>
                {copy.hero.live}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="self-end text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]" style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", fontFamily: "var(--font-noto)" }}>
                {copy.hero.sampleUser}
              </div>
              <div className="self-start text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%] text-white" style={{ background: "linear-gradient(135deg,#219EBC,#023047)", border: "1px solid rgba(255,255,255,0.15)" }}>
                {copy.hero.sampleReply}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.2} floatAmt={7} floatDur={7} className="absolute right-6 top-2 w-52 p-4">
            <div className="flex flex-col items-center gap-3 py-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8ECAE6,#219EBC)" }}>
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-end gap-1 h-8">
                {[3, 6, 9, 12, 9, 6, 11, 7, 4, 8].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ background: "#8ECAE6", height: `${h * 2}px` }}
                    animate={{ scaleY: [1, 1.6, 1] }}
                    transition={{ duration: 0.8, delay: i * 0.08, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-center" style={{ color: "#ffffff" }}>{copy.hero.voice}</p>
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.8)" }}>{copy.hero.voiceBody}</p>
            </div>
          </GlassCard>

          <GlassCard delay={0.3} floatAmt={9} floatDur={8} className="absolute right-[16rem] bottom-20 w-56 p-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Lock className="h-4 w-4" style={{ color: "#8ECAE6" }} />
              </span>
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: "#ffffff" }}>{copy.hero.private}</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{copy.hero.privateBody}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.35} floatAmt={6} floatDur={9} className="absolute right-[6.5rem] bottom-32 w-52 p-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{ background: "var(--teal)" }}>
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--white)" }}>{copy.hero.whatsapp}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.8)" }}>{copy.hero.whatsappBody}</p>
              </div>
            </div>
          </GlassCard>

          <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(142,202,230,0.38) 0%, rgba(33,158,188,0.18) 50%, transparent 80%)", filter: "blur(2px)" }} />

          <GlassCard delay={0.45} floatAmt={5} floatDur={10} className="absolute right-0 bottom-0 w-max px-5 py-3">
            <div className="flex items-center gap-4">
              {copy.hero.stats.map(({ value, label }: { value: string; label: string }, i: number) => (
                <div key={label} className="flex items-center gap-4">
                  {i > 0 && <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.25)" }} />}
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: "#ffffff", fontFamily: "var(--font-playfair)" }}>{value}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.8)" }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, var(--sky-mist))" }} />
    </section>
  );
}
