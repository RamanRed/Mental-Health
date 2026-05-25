"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

/* ─── Colour tokens ─── */
const C = {
  muted:   "var(--sky)",   // Sky Blue for hover/muted elements
  dark:    "var(--white)",   // Since background is dark, text is white
  sub:     "rgba(255,255,255,0.6)", // Secondary text
  pill:    "rgba(255,255,255,0.12)", // transparent glass style pill
  pillHov: "rgba(255,255,255,0.22)", // hover transparent glass style pill
  cardBlue: "var(--teal)",   // highlights
  hoverBlue: "var(--teal)",  // highlights hover (use same teal token)
  serif:   "var(--font-playfair,'Playfair Display',Georgia,serif)",
  sans:    "var(--font-inter,system-ui,sans-serif)",
};

/* ─── Envelope SVG ─── */
function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 20 16" width="16" height="16" fill="none"
      stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="18" height="14" rx="2" />
      <path d="M1 4l9 6 9-6" />
    </svg>
  );
}

/* ─── Pill link button ─── */
function PillBtn({ label, href = "#" }: { label: string; href?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href as "/"}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      "inline-block",
        border:       "1px solid rgba(255,255,255,0.15)",
        borderRadius: "30px",
        padding:      "8px 18px",
        fontFamily:   C.sans,
        fontSize:     "13px",
        color:        "#ffffff",
        background:   hov ? C.pillHov : C.pill,
        cursor:       "pointer",
        textDecoration: "none",
        transition:   "background 0.2s ease",
        width:        "fit-content",
        whiteSpace:   "nowrap",
      }}
    >
      {label}
    </Link>
  );
}

/* ─── Footer Component ─── */
export default function Footer() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const contentRef   = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const [btnHov,    setBtnHov]    = useState(false);
  const [email,     setEmail]     = useState("");

  /* Scroll animation */
  useEffect(() => {
    [contentRef, watermarkRef].forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      el.style.opacity   = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = `opacity 0.8s ease ${i * 0.1}s, transform 0.8s ease ${i * 0.1}s`;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity   = "1";
            el.style.transform = "translateY(0)";
            obs.unobserve(el);
          }
        },
        { threshold: 0.1 }
      );
      obs.observe(el);
      return () => obs.disconnect();
    });
  }, []);

  const supportLinks = copy.footer.supportLinks;
  const navLinks     = copy.footer.navLinks;
  const socialLinks  = copy.footer.socialLinks;
  const legalLinks   = copy.footer.legalLinks;

  return (
    <footer
      id="footer"
      aria-label="Site footer"
      style={{
        background: "var(--prussian)",
        position:   "relative",
        overflow:   "hidden",
        padding:    "80px clamp(20px,5vw,56px) 40px",
      }}
    >
      {/* ── Giant watermark typography ── */}
      <div
        ref={watermarkRef}
        aria-hidden
        style={{
          position:      "absolute",
          bottom:        "40px",
          left:          0,
          right:         0,
          overflow:      "hidden",
          pointerEvents: "none",
          textAlign:     "center",
          lineHeight:    1,
          zIndex:        0,
        }}
      >
        <span
          style={{
            fontFamily:    C.serif,
            fontSize:      "clamp(100px,18vw,180px)",
            fontWeight:    900,
            color:         "rgba(255,255,255,0.05)",
            whiteSpace:    "nowrap",
            letterSpacing: "-4px",
            display:       "block",
            userSelect:    "none",
          }}
        >
          Saathi
        </span>
      </div>

      {/* ── Main content ── */}
      <div
        ref={contentRef}
        style={{
          position: "relative",
          zIndex:   1,
          maxWidth: "1200px",
          margin:   "0 auto",
        }}
      >
        {/* ── Top centre content ── */}
        <div style={{ textAlign: "center", marginBottom: "60px" }}>

          {/* Headline */}
          <h2 style={{ fontFamily: C.serif, margin: 0, lineHeight: 1.2 }}>
            <span style={{ fontSize: "clamp(2rem,4vw,3.2rem)", color: C.muted, fontWeight: 700 }}>
              Rethink about your mental health
            </span>
          </h2>

          {/* Sub-text removed per request */}

          {/* Email input row */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              {/* Envelope icon */}
              <span style={{
                position:      "absolute",
                left:          "16px",
                pointerEvents: "none",
                display:       "flex",
                alignItems:    "center",
                zIndex:        2,
              }}>
                <EnvelopeIcon />
              </span>

              {/* Input */}
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address for newsletter"
                style={{
                  padding:       "14px 20px 14px 44px",
                  borderRadius:  "50px 0 0 50px",
                  border:        "1px solid rgba(255,255,255,0.65)",
                  borderRight:   "none",
                  background:    "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  fontFamily:    C.sans,
                  fontSize:      "14px",
                  color:         C.dark,
                  width:         "clamp(200px,30vw,280px)",
                  outline:       "none",
                }}
              />

              {/* Submit button */}
              <button
                onMouseEnter={() => setBtnHov(true)}
                onMouseLeave={() => setBtnHov(false)}
                onClick={() => setEmail("")}
                aria-label="Subscribe to newsletter"
                style={{
                  padding:      "14px 26px",
                  borderRadius: "0 50px 50px 0",
                  border:       "none",
                  background:   btnHov ? C.hoverBlue : C.cardBlue,
                  color:        C.dark,
                  fontFamily:   C.sans,
                  fontSize:     "14px",
                  fontWeight:   700,
                  cursor:       "pointer",
                  transition:   "background 0.2s ease",
                  whiteSpace:   "nowrap",
                }}
              >
                  {copy.footer.subscribe}
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer links columns ── */}
        <div
          className="footer-links"
          style={{
            display:         "flex",
            justifyContent:  "space-between",
            marginTop:       "80px",
            paddingTop:      "40px",
            flexWrap:        "wrap",
            gap:             "32px",
          }}
        >
          {/* Left — Support links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
            <p style={{ fontFamily: C.sans, fontSize: "11px", fontWeight: 700, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
              {copy.footer.supportTitle}
            </p>
            {supportLinks.map((l: string) => (
              <PillBtn key={l} label={l} href="#" />
            ))}
          </div>

          {/* Centre brand mark */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{
              width:        "52px",
              height:       "52px",
              borderRadius: "50%",
                background:   `linear-gradient(135deg,var(--sky),var(--teal))`,
                  display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              boxShadow:    "0 4px 18px rgba(33,158,188,0.22)",
            }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <span style={{ fontFamily: C.serif, fontSize: "15px", fontWeight: 700, color: C.dark }}>
              Saathi
            </span>
            <p style={{ fontFamily: C.sans, fontSize: "12px", color: C.muted, textAlign: "center", maxWidth: "180px", lineHeight: 1.6, margin: 0 }}>
              {copy.footer.brand}
            </p>
          </div>

          {/* Right — Nav links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
            <p style={{ fontFamily: C.sans, fontSize: "11px", fontWeight: 700, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
              {copy.footer.navTitle}
            </p>
            {navLinks.map((l: { label: string; href: string }) => (
              <PillBtn key={l.label} label={l.label} href={l.href} />
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="footer-bottom"
          style={{
            display:         "flex",
            justifyContent:  "space-between",
            alignItems:      "center",
            marginTop:       "48px",
            paddingTop:      "20px",
            borderTop:       "1px solid rgba(255,255,255,0.08)",
            flexWrap:        "wrap",
            gap:             "12px",
          }}
        >
          {/* Social links */}
          <div style={{ display: "flex", gap: "24px" }}>
            {socialLinks.map((s: string) => (
              <button
                key={s}
                style={{
                  fontFamily:     C.sans,
                  fontSize:       "13px",
                  color:          C.sub,
                  background:     "none",
                  border:         "none",
                  cursor:         "pointer",
                  padding:        0,
                  textDecoration: "none",
                  transition:     "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.dark)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.sub)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Copyright */}
          <p style={{ fontFamily: C.sans, fontSize: "12px", color: C.sub, margin: 0, textAlign: "center" }}>
            {copy.footer.copyright}
          </p>

          {/* Legal links */}
          <div style={{ display: "flex", gap: "20px" }}>
            {legalLinks.map((l: string) => (
              <button
                key={l}
                style={{
                  fontFamily:  C.sans,
                  fontSize:    "13px",
                  color:       C.sub,
                  background:  "none",
                  border:      "none",
                  cursor:      "pointer",
                  padding:     0,
                  transition:  "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.dark)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.sub)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .footer-links  { flex-direction: column; align-items: center; text-align: center; }
          .footer-bottom { flex-direction: column; align-items: center; text-align: center; }
        }
      `}</style>
    </footer>
  );
}
