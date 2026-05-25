"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

/* ─── Colour tokens (mapped to MindWell AI palette) ─── */
const C = {
  headingMuted:  "var(--sky)",   // sky blue  →  "muted" grey feel from palette
  headingBlue:   "var(--teal)",   // teal      →  blue accent
  headingDark:   "var(--prussian)",   // prussian  →  dark slate
  bodyText:      "var(--prussian-muted)",
  chip1:         "var(--sky)",
  chip2:         "var(--teal)",
};

/* ─── Inline person silhouette SVG inside the chip ─── */
function PersonChip() {
  return (
    <span
      aria-hidden
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        verticalAlign:  "middle",
        width:          "80px",
        height:         "48px",
        borderRadius:   "28px",
        overflow:       "hidden",
        margin:         "0 10px",
        background:     `linear-gradient(135deg, ${C.chip1}, ${C.chip2})`,
        flexShrink:     0,
        position:       "relative",
      }}
    >
      <svg
        viewBox="0 0 80 48"
        width="80"
        height="48"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* head */}
        <circle cx="40" cy="14" r="9" fill="rgba(255,255,255,0.45)" />
        {/* shoulders */}
        <ellipse cx="40" cy="38" rx="16" ry="11" fill="rgba(255,255,255,0.32)" />
      </svg>
    </span>
  );
}

/* ─── About Section ─── */
export default function AboutSection() {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          // LEFT: existing behaviour (slide in from left)
          if (entry.target === leftRef.current && leftRef.current) {
            const el = leftRef.current as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "translateX(0)";
            observer.unobserve(el);
            return;
          }

          // RIGHT: orchestrate child animations
          if (entry.target === rightRef.current && rightRef.current) {
            const container = rightRef.current as HTMLElement;

            // Primary paragraph
            const primary = container.querySelector<HTMLElement>(".about-primary");
            if (primary) {
              setTimeout(() => {
                primary.style.opacity = "1";
                primary.style.transform = "translateY(0)";
              }, 100); // 0.1s
            }

            // Divider
            const divider = container.querySelector<HTMLElement>(".about-divider");
            if (divider) {
              setTimeout(() => {
                divider.style.width = "48px";
              }, 400); // 0.4s
            }

            // Secondary paragraph
            const secondary = container.querySelector<HTMLElement>(".about-secondary");
            if (secondary) {
              setTimeout(() => {
                secondary.style.opacity = "1";
                secondary.style.transform = "translateY(0)";
              }, 500); // 0.5s
            }

            // Stat cards (stagger)
            const stats = document.querySelectorAll<HTMLElement>(".about-stat-card");
            if (stats && stats.length > 0) {
              stats.forEach((card, i) => {
                const delay = 300 + i * 100; // start at 0.3s, stagger 0.1s
                setTimeout(() => {
                  card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
                  card.style.opacity = "1";
                  card.style.transform = "translateY(0)";
                }, delay);
              });
            }

            observer.unobserve(entry.target);
            return;
          }
        });
      },
      { threshold: 0.18 }
    );

    if (leftRef.current) observer.observe(leftRef.current);
    if (rightRef.current) observer.observe(rightRef.current);

    return () => observer.disconnect();
  }, []);

  const headingSize = "clamp(2rem, 3.5vw, 2.8rem)";
  const serif       = "var(--font-playfair, 'Playfair Display', Georgia, serif)";
  const sans        = "var(--font-inter, system-ui, sans-serif)";

  return (
    <section
      id="about"
      aria-label="About Saathi"
      style={{
        background: "var(--sky-mist)",
        padding: "100px clamp(24px, 5vw, 56px)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin:   "0 auto",
          display:  "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:      "clamp(40px, 8vw, 80px)",
          alignItems: "center",
        }}
        className="about-grid"
      >
        {/* ───── LEFT — Headline ───── */}
        <div
          ref={leftRef}
          style={{
            opacity:    0,
            transform:  "translateX(-30px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2
            style={{
              fontFamily: serif,
              margin:     0,
              lineHeight: 1.2,
            }}
          >
            {/* Row 1: muted "Mental health" + inline photo chip */}
            <span
              style={{
                fontSize:   headingSize,
                color:      C.headingMuted,
                fontWeight: 400,
                display:    "inline",
              }}
            >
              {copy.about.lead}
            </span>

            {/* Inline warm-tone person chip */}
            <PersonChip />

            {/* Row 2 & 3: bold blue */}
            <span
              style={{
                fontSize:   headingSize,
                color:      C.headingBlue,
                fontWeight: 700,
                display:    "block",
                marginTop:  "4px",
              }}
            >
              {copy.about.title1}
            </span>
            <span
              style={{
                fontSize:   headingSize,
                color:      C.headingBlue,
                fontWeight: 700,
                display:    "block",
              }}
            >
              {copy.about.title2}
            </span>

            {/* Row 4: dark prussian */}
            <span
              style={{
                fontSize:   headingSize,
                color:      C.headingDark,
                fontWeight: 700,
                display:    "block",
                marginTop:  "2px",
              }}
            >
              {copy.about.title3}
            </span>
          </h2>
        </div>

        {/* ───── RIGHT — Body copy (REFACTORED) ───── */}
        <div
          ref={rightRef}
          style={{
            // primary container stays offscreen until observed; children animate individually
            opacity: 1,
            transform: "none",
          }}
        >
          {/* Primary paragraph */}
          <p
            className="about-primary"
            style={{
              fontFamily: "DM Sans, var(--font-inter, system-ui, sans-serif)",
              fontSize: "16px",
              color: "var(--prussian-muted)",
              lineHeight: 1.8,
              fontWeight: 400,
              marginBottom: "24px",
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
              maxWidth: "520px",
            }}
          >
            {copy.about.body1}
          </p>

          {/* Short teal divider (animates width) */}
          <div
            className="about-divider"
            style={{
              width: "0px",
              height: "2px",
              background: "var(--teal)",
              marginBottom: "24px",
              borderRadius: "2px",
              transition: "width 0.5s ease-out",
            }}
          />

          {/* Secondary paragraph */}
          <p
            className="about-secondary"
            style={{
              fontFamily: "DM Sans, var(--font-inter, system-ui, sans-serif)",
              fontSize: "15px",
              color: "var(--prussian-soft)",
              opacity: 0,
              lineHeight: 1.8,
              fontWeight: 400,
              transform: "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
              maxWidth: "520px",
            }}
          >
            {copy.about.body2}
          </p>
        </div>
      </div>

      {/* ───── STAT CARDS — below the two-column grid ───── */}
      <div
        className="about-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "64px",
          paddingTop: "48px",
          borderTop: "1px solid var(--sky-light)",
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {[
          { value: "450M+", label: "Indians affected by mental health conditions" },
          { value: "70%", label: "of rural India lacks access to mental healthcare" },
          { value: "1:1M", label: "psychiatrist-to-patient ratio in rural areas" },
          { value: "3", label: "Languages supported — Hindi, Marathi & English" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="about-stat-card"
            style={{
              background: "transparent",
              border: "none",
              boxShadow: "none",
              padding: 0,
              opacity: 0,
              transform: "translateY(24px)",
            }}
          >
            <span style={{
              display: "block",
              fontFamily: "'DM Serif Display', serif",
              fontSize: "2.6rem",
              fontWeight: 700,
              color: "var(--prussian)",
              marginBottom: "6px",
            }}>{s.value}</span>
            <span style={{
              display: "block",
              fontFamily: "DM Sans, var(--font-inter, system-ui, sans-serif)",
              fontSize: "13px",
              color: "var(--prussian-soft)",
              lineHeight: 1.5,
              fontWeight: 400,
              maxWidth: "160px",
            }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Responsive grid collapse */}
      <style>{`
        @media (max-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}
