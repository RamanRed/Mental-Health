"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Colour tokens (CSS vars) ─── */
const C = {
  muted:   "var(--sky)",   // Sky Blue
  dark:    "var(--prussian)",   // Prussian Blue
  sub:     "var(--prussian-soft)",   // Muted Text
  serif:   "var(--font-playfair,'Playfair Display',Georgia,serif)",
  sans:    "var(--font-inter,system-ui,sans-serif)",
};

const RULES = [
  "Be kind and understanding",
  "Respect the experiences of others",
  "Don't post any negative or harmful content",
  "Don't share your private information",
];

/* ─── Overlapping avatar stack ─── */
function AvatarStack({ size = 30, colors }: { size?: number; colors: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {colors.map((bg, i) => (
        <div
          key={i}
          style={{
            width:        `${size}px`,
            height:       `${size}px`,
            borderRadius: "50%",
            background:   bg,
            border:       "2px solid white",
            marginLeft:   i === 0 ? 0 : `-${size * 0.32}px`,
            flexShrink:   0,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Star icons ─── */
function Stars({ count = 5, filled = 5, size = 12 }: { count?: number; filled?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "1px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 14 14" width={size} height={size}>
          <path
            d="M7 1l1.55 3.14L12 4.74l-2.5 2.43.59 3.44L7 9l-3.09 1.61.59-3.44L2 4.74l3.45-.6z"
            fill={i < filled ? "var(--yellow)" : "rgba(2,48,71,0.15)"}
          />
        </svg>
      ))}
    </span>
  );
}

/* ─── Right-panel portrait silhouette ─── */
function PortraitScene() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset:    0,
        overflow: "hidden",
      }}
    >
      {/* Background gradient — "photo" feel */}
      <div style={{
        position: "absolute",
        inset:    0,
        background: "linear-gradient(145deg,var(--sky) 0%,var(--sky-light) 40%,var(--teal) 80%,var(--prussian-muted) 100%)",
      }} />

      {/* Subtle vignette overlay */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(20,45,70,0.38) 100%)",
      }} />

      {/* ── Portrait silhouette shapes ── */}

      {/* Shoulder / clothing area (trapezoid) */}
      <div style={{
        position:     "absolute",
        bottom:       "0",
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        "260px",
        height:       "200px",
        background:   "linear-gradient(180deg,rgba(120,165,200,0.55) 0%,rgba(60,100,140,0.75) 100%)",
        clipPath:     "polygon(15% 0%,85% 0%,100% 100%,0% 100%)",
      }} />

      {/* Neck */}
      <div style={{
        position:     "absolute",
        bottom:       "195px",
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        "34px",
        height:       "44px",
        background:   "rgba(40,70,100,0.65)",
        borderRadius: "6px",
      }} />

      {/* Head */}
      <div style={{
        position:     "absolute",
        bottom:       "232px",
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        "110px",
        height:       "125px",
        background:   "rgba(40,70,100,0.68)",
        borderRadius: "55% 55% 48% 48% / 58% 58% 42% 42%",
      }} />

      {/* Hair — top */}
      <div style={{
        position:     "absolute",
        bottom:       "340px",
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        "118px",
        height:       "65px",
        background:   "rgba(25,50,75,0.82)",
        borderRadius: "50% 50% 20% 20%",
      }} />

      {/* Hair — left side lock */}
      <div style={{
        position:     "absolute",
        bottom:       "260px",
        left:         "calc(50% - 68px)",
        width:        "30px",
        height:       "80px",
        background:   "rgba(25,50,75,0.75)",
        borderRadius: "0 0 40% 60% / 0 0 60% 40%",
        transform:    "rotate(-8deg)",
      }} />

      {/* Hair — right side lock */}
      <div style={{
        position:     "absolute",
        bottom:       "260px",
        left:         "calc(50% + 38px)",
        width:        "30px",
        height:       "75px",
        background:   "rgba(25,50,75,0.75)",
        borderRadius: "0 0 60% 40% / 0 0 40% 60%",
        transform:    "rotate(8deg)",
      }} />

      {/* Left shoulder arm */}
      <div style={{
        position:     "absolute",
        bottom:       "100px",
        left:         "calc(50% - 145px)",
        width:        "80px",
        height:       "140px",
        background:   "linear-gradient(180deg,rgba(100,145,185,0.5),rgba(55,90,130,0.7))",
        borderRadius: "40% 20% 20% 40%",
        transform:    "rotate(12deg)",
      }} />

      {/* Right shoulder arm */}
      <div style={{
        position:     "absolute",
        bottom:       "100px",
        left:         "calc(50% + 65px)",
        width:        "80px",
        height:       "140px",
        background:   "linear-gradient(180deg,rgba(100,145,185,0.5),rgba(55,90,130,0.7))",
        borderRadius: "20% 40% 40% 20%",
        transform:    "rotate(-12deg)",
      }} />

      {/* Soft light rim on face */}
      <div style={{
        position:     "absolute",
        bottom:       "230px",
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        "80px",
        height:       "90px",
        background:   "rgba(200,225,245,0.12)",
        borderRadius: "50%",
        filter:       "blur(10px)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Community Section ─── */
export default function CommunitySection() {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [viewAllHov, setViewAllHov] = useState(false);

  /* Scroll animation */
  useEffect(() => {
    const pairs = [
      { ref: leftRef,  dx: -30 },
      { ref: rightRef, dx:  30 },
    ];
    pairs.forEach(({ ref, dx }) => {
      const el = ref.current;
      if (!el) return;
      el.style.opacity   = "0";
      el.style.transform = `translateX(${dx}px)`;
      el.style.transition = "opacity 0.7s ease, transform 0.7s ease";

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity   = "1";
            el.style.transform = "translateX(0)";
            obs.unobserve(el);
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      return () => obs.disconnect();
    });
  }, []);

  const reviewAvatarColors = [
    "hsl(210,55%,62%)",
    "hsl(225,50%,65%)",
    "hsl(195,48%,60%)",
    "hsl(240,42%,68%)",
  ];

  const memberAvatarColors = [
    "hsl(205,50%,62%)",
    "hsl(220,48%,65%)",
    "hsl(195,52%,60%)",
    "hsl(235,44%,67%)",
    "hsl(210,46%,63%)",
  ];

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .community-grid { grid-template-columns: 1fr !important; }
          .community-right { min-height: 320px !important; }
        }
      `}</style>

      <section
        id="community"
        aria-label="Community Support Circle"
        style={{
          background: "linear-gradient(180deg, var(--sky-mist) 0%, var(--sky-light) 100%)",
          padding:    "80px clamp(20px,5vw,56px)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* ── Split card wrapper ── */}
          <div
            className="community-grid"
            style={{
              borderRadius:        "28px",
              overflow:            "hidden",
              display:             "grid",
              gridTemplateColumns: "1fr 1.5fr",
            }}
          >
            {/* ─── LEFT PANEL ─── */}
            <div
              ref={leftRef}
              style={{
                background: "rgba(255,255,255,0.78)",
                padding:    "clamp(28px,4vw,48px)",
                display:    "flex",
                flexDirection: "column",
                border: "1px solid rgba(255,255,255,0.45)",
                borderRadius: "28px 0 0 28px",
              }}
            >
              {/* Title */}
              <h2 style={{ fontFamily: C.serif, margin: "0 0 4px", lineHeight: 1.2 }}>
                <span style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", color: C.muted,  fontWeight: 400, display: "block" }}>Community</span>
                <span style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", color: C.dark,   fontWeight: 700, display: "block" }}>Support</span>
                <span style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", color: C.dark,   fontWeight: 400, fontStyle: "italic", display: "block" }}>Circle</span>
              </h2>

              {/* Sub */}
              <p style={{ fontFamily: C.sans, fontSize: "14px", color: C.sub, lineHeight: 1.65, margin: "12px 0 20px", maxWidth: "280px" }}>
                Share experiences anonymously and support others on their wellness journey.
              </p>

              {/* Review badge */}
              <div style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "10px",
                background:   "rgba(255,255,255,0.85)",
                border:       "1px solid rgba(2,48,71,0.08)",
                borderRadius: "50px",
                padding:      "10px 16px",
                marginBottom: "20px",
                width:        "fit-content",
              }}>
                <AvatarStack size={28} colors={reviewAvatarColors} />
                <div style={{ width: "1px", height: "18px", background: "rgba(2,48,71,0.12)" }} />
                <span style={{ fontFamily: C.sans, fontSize: "13px", fontWeight: 600, color: C.dark, whiteSpace: "nowrap" }}>
                  +1.3K Reviews
                </span>
                <div style={{ width: "1px", height: "18px", background: "rgba(2,48,71,0.12)" }} />
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontFamily: C.sans, fontSize: "13px", fontWeight: 700, color: C.dark }}>5.0</span>
                  <Stars count={5} filled={5} size={11} />
                </span>
              </div>

              {/* View All button */}
              <button
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--teal)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--teal)";
                }}
                style={{
                  background:   "var(--teal)",
                  border:       "none",
                  borderRadius: "50px",
                  padding:      "10px 22px",
                  fontFamily:   C.sans,
                  fontSize:     "13px",
                  fontWeight:   600,
                  color:        "var(--white)",
                  cursor:       "pointer",
                  display:      "inline-block",
                  marginBottom: "28px",
                  width:        "fit-content",
                  transition:   "background 0.2s ease",
                  boxShadow: "0 3px 12px rgba(33,158,188,0.22)",
                }}
                aria-label="View all community posts"
              >
                View All
              </button>

              {/* Community Rules */}
              <p style={{ fontFamily: C.sans, fontSize: "13px", fontWeight: 700, color: C.dark, margin: "0 0 12px" }}>
                Community Rules
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {RULES.map((rule) => (
                  <li key={rule} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ fontFamily: C.sans, fontSize: "13px", fontWeight: 700, color: "var(--teal)", lineHeight: 1.5, flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: C.sans, fontSize: "13px", color: C.sub, lineHeight: 1.55 }}>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div
              ref={rightRef}
              className="community-right"
              style={{
                position:  "relative",
                minHeight: "420px",
                overflow:  "hidden",
              }}
            >
              <PortraitScene />

              {/* ── Star Rating Chip — top left ── */}
              <div style={{
                position:      "absolute",
                top:           "20px",
                left:          "20px",
                display:       "flex",
                alignItems:    "center",
                gap:           "6px",
                background:    "rgba(255,255,255,0.9)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius:  "30px",
                padding:       "8px 14px",
                zIndex:        10,
                border:        "1px solid rgba(255,255,255,0.6)",
              }}>
                <svg viewBox="0 0 20 20" width="18" height="18">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"
                    fill="var(--yellow)" />
                </svg>
                <span style={{ fontFamily: C.sans, fontSize: "14px", fontWeight: 700, color: C.dark }}>3.5</span>
              </div>

              {/* ── Person card — bottom ── */}
              <div style={{
                position:      "absolute",
                bottom:        "20px",
                left:          "20px",
                right:         "20px",
                background:    "rgba(255,255,255,0.14)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border:        "1px solid rgba(255,255,255,0.28)",
                borderRadius:  "18px",
                padding:       "16px 18px",
                zIndex:        10,
              }}>
                <p style={{ fontFamily: C.serif, fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1.2 }}>
                  Priya M.
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "12px", color: "rgba(255,255,255,0.78)", margin: "3px 0 0" }}>
                  Nashik, Maharashtra
                </p>

                {/* Member avatar row */}
                <div style={{ display: "flex", gap: "8px", marginTop: "14px", alignItems: "center" }}>
                  {memberAvatarColors.map((bg, i) => (
                    <div
                      key={i}
                      style={{
                        width:        "36px",
                        height:       "36px",
                        borderRadius: "50%",
                        background:   bg,
                        border:       "2px solid rgba(255,255,255,0.42)",
                        flexShrink:   0,
                      }}
                    />
                  ))}
                  <span style={{ fontFamily: C.sans, fontSize: "11px", color: "rgba(255,255,255,0.65)", marginLeft: "4px" }}>
                    +248 members
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
