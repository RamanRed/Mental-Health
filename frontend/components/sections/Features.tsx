"use client";

import { useEffect, useRef } from "react";
import { GradientCard } from "@/components/ui/gradient-card";
import { useLocale } from "next-intl";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

/* ─── Colour tokens (use CSS variables) ─── */
const C = {
  muted:    "var(--sky)",   // Sky Blue
  dark:     "var(--prussian)",   // Prussian Blue
  sub:      "var(--prussian-soft)",   // Muted Text
  arrowBg:  "var(--sky)",
  arrowHov: "var(--teal)",
};

const serif = "var(--font-playfair,'Playfair Display',Georgia,serif)";
const sans  = "var(--font-inter,system-ui,sans-serif)";

const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none"
    stroke="var(--prussian)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

/* ─── useScrollReveal hook ─── */
function useScrollReveal(
  ref: React.RefObject<HTMLElement>,
  { delay = 0, fromX = 0, fromY = 0 }: { delay?: number; fromX?: number; fromY?: number }
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity   = "0";
    el.style.transform = `translate(${fromX}px, ${fromY}px)`;
    el.style.transition = `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity   = "1";
          el.style.transform = "translate(0,0)";
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, delay, fromX, fromY]);
}

const SERVICES = [
  {
    gradient: "orange" as const,
    badgeText: "24/7 Support",
    badgeColor: "var(--orange)", // UT Orange
    title: "Call Services",
    description: "Get instant access to compassionate, human-in-the-loop support calls anytime you need to talk.",
    ctaText: "Start a call",
    ctaHref: "/call",
  },
  {
    gradient: "purple" as const,
    badgeText: "AI Companion",
    badgeColor: "var(--teal)", // Blue Green
    title: "Personalized Chatbot",
    description: "Converse with our intelligent AI companion, designed to adapt specifically to your emotional state.",
    ctaText: "Chat now",
    ctaHref: "/chat",
  },
  {
    gradient: "green" as const,
    badgeText: "Self Care",
    badgeColor: "var(--sky)", // Sky Blue
    title: "Mood Tracking + Screening",
    description: "Monitor your daily emotions and screen for key wellness trends securely and privately.",
    ctaText: "Check mood",
    ctaHref: "/mood",
  },
  {
    gradient: "gray" as const,
    badgeText: "Verified Care",
    badgeColor: "var(--yellow)", // Selective Yellow
    title: "Instant Communication",
    description: "Locate and connect with professional mental health specialists near your geographical area.",
    ctaText: "Find doctors",
    ctaHref: "/doctor",
  },
  {
    gradient: "orange" as const,
    badgeText: "Universal Access",
    badgeColor: "var(--orange)", // UT Orange
    title: "Multilingual Support",
    description: "Receive tailored mental wellness materials and AI conversation in your preferred native language.",
    ctaText: "Change language",
    ctaHref: "/language",
  },
];

/* ─── Features Section ─── */
export default function FeaturesSection() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const headerRef = useRef<HTMLDivElement>(null);
  const card1Ref  = useRef<HTMLDivElement>(null);
  const card2Ref  = useRef<HTMLDivElement>(null);
  const card3Ref  = useRef<HTMLDivElement>(null);
  const card4Ref  = useRef<HTMLDivElement>(null);
  const card5Ref  = useRef<HTMLDivElement>(null);
  const services = SERVICES.map((service, index) => ({ ...service, ...copy.features.services[index] }));

  useScrollReveal(headerRef as React.RefObject<HTMLElement>, { fromX: -20 });
  useScrollReveal(card1Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0 });
  useScrollReveal(card2Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0.08 });
  useScrollReveal(card3Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0.16 });
  useScrollReveal(card4Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0.24 });
  useScrollReveal(card5Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0.32 });

  return (
    <>
      <style>{`
        .feat-get-help:hover .feat-arrow-circle { background: var(--teal) !important; }
        .feat-get-help:hover .feat-link-text    { color: var(--prussian) !important; }
        @media (max-width: 600px) {
          .feat-header-row      { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
        }
      `}</style>

      <section
        id="features"
        aria-label="Platform features"
        style={{
          background: "var(--sky-mist)",
          padding:    "100px clamp(24px,5vw,56px)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

          {/* ── Header row ── */}
          <div
            ref={headerRef}
            className="feat-header-row"
            style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "flex-end",
              marginBottom:   "48px",
              gap:            "24px",
            }}
          >
            {/* Left — headline */}
            <h2 style={{ fontFamily: serif, margin: 0, lineHeight: 1.15 }}>
              <span style={{ fontSize: "clamp(2.2rem,4vw,3.5rem)", color: C.muted, fontWeight: 400 }}>
                {copy.features.title1}{" "}
              </span>
              <span style={{ fontSize: "clamp(2.2rem,4vw,3.5rem)", color: C.dark, fontWeight: 700 }}>
                {copy.features.title2}
              </span>
              <br />
              <span style={{ fontSize: "clamp(2.2rem,4vw,3.5rem)", color: C.muted, fontWeight: 400 }}>
                {copy.features.title3}{" "}
              </span>
              <span style={{ fontSize: "clamp(2.2rem,4vw,3.5rem)", color: C.muted, fontWeight: 400, fontStyle: "italic" }}>
                {copy.features.title4}
              </span>
            </h2>

            {/* Right — Get Help Now */}
            <a
              href="/login"
              className="feat-get-help"
              aria-label={copy.features.cta}
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            "10px",
                cursor:         "pointer",
                textDecoration: "none",
                flexShrink:     0,
              }}
            >
              <span
                className="feat-link-text"
                style={{
                  fontFamily:  sans,
                  fontSize:    "14px",
                  fontWeight:  500,
                  color:       C.dark,
                  transition:  "color 0.2s ease",
                }}
              >
                  {copy.features.cta}
              </span>
              <span
                className="feat-arrow-circle"
                style={{
                  width:          "36px",
                  height:         "36px",
                  borderRadius:   "50%",
                  background:     C.arrowBg,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  transition:     "background 0.2s ease",
                }}
              >
                <ArrowIcon />
              </span>
            </a>
          </div>

          {/* ── Premium balanced card grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <div className="lg:col-span-2" ref={card1Ref}>
              <GradientCard {...services[0]} />
            </div>
            <div className="lg:col-span-2" ref={card2Ref}>
              <GradientCard {...services[1]} />
            </div>
            <div className="lg:col-span-2" ref={card3Ref}>
              <GradientCard {...services[2]} />
            </div>
            <div className="lg:col-span-3" ref={card4Ref}>
              <GradientCard {...services[3]} />
            </div>
            <div className="lg:col-span-3" ref={card5Ref}>
              <GradientCard {...services[4]} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

