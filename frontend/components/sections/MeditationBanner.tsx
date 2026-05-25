"use client";

import { useEffect, useRef, useState } from "react";

const C = {
  dark:    "#023047",
  darker:  "#1a2f45",
  sub:     "rgba(2,48,71,0.70)",
  sans:    "var(--font-inter,system-ui,sans-serif)",
  serif:   "var(--font-playfair,'Playfair Display',Georgia,serif)",
};

/* ─── Seated meditation person (SVG silhouette) ─── */
function PersonSilhouette() {
  const fill = "rgba(40,65,90,0.88)";
  return (
    <div
      aria-hidden
      style={{
        position:  "absolute",
        bottom:    0,
        left:      "50%",
        transform: "translateX(-50%)",
        width:     "60px",
        height:    "140px",
        zIndex:    1,
      }}
    >
      <svg viewBox="0 0 60 140" width="60" height="140" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <circle cx="30" cy="16" r="12" fill={fill} />
        {/* Neck */}
        <rect x="26" y="26" width="8" height="8" rx="3" fill={fill} />
        {/* Torso */}
        <rect x="19" y="32" width="22" height="44" rx="8" fill={fill} />
        {/* Left arm resting */}
        <path d="M19 52 Q8 60 10 76" stroke={fill} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Right arm resting */}
        <path d="M41 52 Q52 60 50 76" stroke={fill} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Crossed legs — wide lotus-pose oval */}
        <ellipse cx="30" cy="100" rx="28" ry="14" fill={fill} />
        {/* Left foot */}
        <ellipse cx="10" cy="112" rx="8" ry="5" fill={fill} />
        {/* Right foot */}
        <ellipse cx="50" cy="112" rx="8" ry="5" fill={fill} />
        {/* Hands in lap */}
        <ellipse cx="20" cy="80" rx="6" ry="4" fill={fill} />
        <ellipse cx="40" cy="80" rx="6" ry="4" fill={fill} />
      </svg>
    </div>
  );
}

/* ─── Refresh/spiral arrow icon ─── */
function SpiralArrow() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none"
      stroke={C.dark} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9A5 5 0 1 1 9 4" />
      <path d="M9 1l3 3-3 3" />
    </svg>
  );
}

/* ─── Meditation Banner ─── */
export default function MeditationBanner() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [btnHov, setBtnHov] = useState(false);

  /* Scroll animation — fade + scale in */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.opacity   = "0";
    el.style.transform = "scale(0.96)";
    el.style.transition = "opacity 0.8s ease, transform 0.8s ease";

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity   = "1";
          el.style.transform = "scale(1)";
          obs.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="meditation"
      aria-label="Benefits of meditation"
      style={{
        width:    "100%",
        height:   "420px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Layer 1 — Base gradient landscape ── */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "linear-gradient(180deg,#c8d8e8 0%,#a8c0d8 30%,#88a8c8 60%,#6888a8 100%)",
      }} />

      {/* ── Layer 2 — Sky fog ── */}
      <div style={{
        position:   "absolute",
        top:        0, left: 0, right: 0,
        height:     "60%",
        background: "linear-gradient(180deg,rgba(235,243,252,0.9) 0%,rgba(210,228,245,0.6) 50%,transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Layer 3a — Distant mountain range ── */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     "60%",
        background: "linear-gradient(180deg,rgba(100,130,160,0.6),rgba(80,110,140,0.82))",
        clipPath:   "polygon(0% 100%,0% 60%,20% 20%,40% 50%,55% 10%,70% 40%,85% 15%,100% 45%,100% 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Layer 3b — Closer/darker mountains ── */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     "40%",
        background: "rgba(70,100,130,0.55)",
        clipPath:   "polygon(0% 100%,0% 70%,15% 40%,30% 65%,50% 30%,65% 55%,80% 35%,95% 60%,100% 45%,100% 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Layer 4 — Person silhouette ── */}
      <PersonSilhouette />

      {/* ── Layer 5 — Water/lake reflection at bottom ── */}
      <div style={{
        position:      "absolute",
        bottom:        0, left: 0, right: 0,
        height:        "30%",
        background:    "linear-gradient(180deg,transparent,rgba(100,140,175,0.4) 60%,rgba(80,120,160,0.62) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Layer 6 — Top fade from white ── */}
      <div style={{
        position:      "absolute",
        top:           0, left: 0, right: 0,
        height:        "120px",
        background:    "linear-gradient(180deg,#ffffff 0%,transparent 100%)",
        pointerEvents: "none",
        zIndex:        3,
      }} />

      {/* ── Layer 7 — Bottom fade to white ── */}
      <div style={{
        position:      "absolute",
        bottom:        0, left: 0, right: 0,
        height:        "120px",
        background:    "linear-gradient(0deg,#ffffff 0%,transparent 100%)",
        pointerEvents: "none",
        zIndex:        3,
      }} />

      {/* ── Centered text content ── */}
      <div
        ref={contentRef}
        style={{
          position:  "absolute",
          top:       "50%",
          left:      "50%",
          transform: "translate(-50%,-50%)",
          textAlign: "center",
          zIndex:    4,
          width:     "100%",
          maxWidth:  "600px",
          padding:   "0 24px",
        }}
      >
        {/* Headline */}
        <h2 style={{ fontFamily: C.serif, margin: 0, lineHeight: 1.15 }}>
          <span style={{
            fontSize:   "clamp(2.4rem,5vw,4.2rem)",
            color:      C.dark,
            fontWeight: 400,
          }}>
            Benefits of{" "}
          </span>
          <span style={{
            fontSize:   "clamp(2.4rem,5vw,4.2rem)",
            color:      C.darker,
            fontWeight: 400,
            fontStyle:  "italic",
          }}>
            Meditation
          </span>
        </h2>

        {/* Sub-headline */}
        <span style={{
          display:    "block",
          fontFamily: C.sans,
          fontSize:   "14px",
          color:      C.sub,
          marginTop:  "12px",
          lineHeight: 1.65,
        }}>
          Morning Meditation For a Calm Focused Life.
        </span>

        {/* CTA Button */}
        <button
          onMouseEnter={() => setBtnHov(true)}
          onMouseLeave={() => setBtnHov(false)}
          aria-label="Start Your Day with Peace"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "8px",
            marginTop:      "20px",
            padding:        "14px 28px",
            borderRadius:   "50px",
            background:     btnHov ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border:         "1px solid rgba(255,255,255,0.75)",
            fontFamily:     C.sans,
            fontSize:       "14px",
            fontWeight:     600,
            color:          C.dark,
            cursor:         "pointer",
            transform:      btnHov ? "translateY(-2px)" : "translateY(0)",
            transition:     "background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
            boxShadow:      btnHov
              ? "0 8px 28px rgba(2,48,71,0.14)"
              : "0 4px 16px rgba(2,48,71,0.08)",
          }}
        >
          <SpiralArrow />
          Start Your Day with Peace
        </button>
      </div>
    </section>
  );
}
