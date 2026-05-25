"use client";

import { useState, CSSProperties } from "react";
import { useLocale } from "next-intl";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

/* ─── Types ─── */
type MoodId = "happy" | "angry" | "good" | "calm" | "sad";
type TabId = "wellness" | "mindfulness" | "habits";

interface MoodData { id: MoodId; label: string; message: string; }
interface TabData { id: TabId; emoji: string; title: string; subtitle: string; }

/* ─── Data ─── */
const MOODS: MoodData[] = [
  { id: "happy", label: "Happy", message: "That's wonderful! Your joy lights up the room. ✨" },
  { id: "angry", label: "Angry", message: "It's okay to feel this way. Let's breathe through it together." },
  { id: "good", label: "Good", message: "Great to hear! Keep nurturing that positive energy." },
  { id: "calm", label: "Calm", message: "A calm mind is your greatest strength. 🌊" },
  { id: "sad", label: "Sad", message: "We're here for you. You're never alone in this. 💙" },
];

const TABS: TabData[] = [
  { id: "wellness", emoji: "🌸", title: "Wellness", subtitle: "Simple Habits to Keep Your Mental Health Strong." },
  { id: "mindfulness", emoji: "🧠", title: "Mindfulness", subtitle: "Meditation Practices for Everyday Life." },
  { id: "habits", emoji: "🔄", title: "Habits", subtitle: "The Power of Routine in Mental Health." },
];

/* ─── Colour tokens (MindWell AI palette) ─── */
const C = {
  muted: "#8ECAE6",   // sky blue
  blue: "#219EBC",   // teal
  dark: "#023047",   // prussian
  msgText: "#5B748C",   // muted text
  bodyInactive: "#8ECAE6",
  bodyHover: "#219EBC",
  bodySelected: "#023047",
  hatInactive: "#8ECAE6",
  hatSelected: "#023047",
  legInactive: "#8ECAE6",
  legSelected: "#023047",
};

/* ─── Inline photo chip (reused from About) ─── */
function InlineChip({ w = 72, h = 44 }: { w?: number; h?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: "24px",
        overflow: "hidden",
        margin: "0 8px",
        background: "linear-gradient(135deg, #c8a882, #9a7050)",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 72 44" width={w} height={h}>
        <circle cx="36" cy="14" r="8" fill="rgba(255,255,255,0.42)" />
        <ellipse cx="36" cy="36" rx="14" ry="10" fill="rgba(255,255,255,0.3)" />
      </svg>
    </span>
  );
}

/* ─── Speech bubble ─── */
function SpeechBubble({ label }: { label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "-48px",
        left: "50%",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        zIndex: 10,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: "20px",
          padding: "6px 16px",
          fontSize: "13px",
          fontWeight: 600,
          color: C.dark,
          fontFamily: "var(--font-inter, system-ui)",
          boxShadow: "0 4px 16px rgba(2,48,71,0.1)",
        }}
      >
        {label}
      </div>
      {/* Triangle pointer */}
      <div
        style={{
          position: "absolute",
          bottom: "-7px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "7px solid rgba(255,255,255,0.9)",
        }}
      />
    </div>
  );
}

/* ─── SVG blob character ─── */
function Character({
  mood,
  selected,
  onClick,
}: {
  mood: MoodData;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bodyColor = selected ? C.bodySelected : hovered ? C.bodyHover : C.bodyInactive;
  const hatColor = selected ? C.hatSelected : hovered ? C.bodyHover : C.hatInactive;
  const legColor = selected ? C.legSelected : hovered ? C.bodyHover : C.legInactive;

  const containerStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    transition: "transform 0.3s ease, opacity 0.3s ease",
    opacity: selected ? 1 : hovered ? 1 : 0.75,
    transform: selected
      ? "scale(1.2) translateY(-15px)"
      : hovered
        ? "scale(1.08) translateY(-5px)"
        : "scale(1) translateY(0)",
    animation: selected ? "bobFloat 3s ease-in-out infinite" : "none",
  };

  const featureColor = selected ? "#ffffff" : "#023047";

  /* Face features per emotion */
  const open = (cx: number, cy: number) => (
    <>
      <circle cx={cx} cy={cy} r={6.5} fill={featureColor} />
      <circle cx={cx + 2} cy={cy - 2} r={2.2} fill={selected ? C.dark : "#ffffff"} />
    </>
  );

  const closedEye = (x1: number, y: number, x2: number) => (
    <path
      d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 5} ${x2} ${y}`}
      stroke={featureColor} strokeWidth="2.2" fill="none" strokeLinecap="round"
    />
  );

  const cheeks = (
    <>
      <ellipse cx="18" cy="57" rx="9" ry="5" fill="#ff9eb5" opacity={selected ? "0.6" : "0.42"} />
      <ellipse cx="72" cy="57" rx="9" ry="5" fill="#ff9eb5" opacity={selected ? "0.6" : "0.42"} />
    </>
  );

  const faces: Record<MoodId, JSX.Element> = {
    happy: (
      <>
        {open(32, 48)} {open(58, 48)}
        {cheeks}
        <path d="M 27 62 Q 45 77 63 62" stroke={featureColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    ),
    angry: (
      <>
        {/* Furrowed brows */}
        <path d="M 22 39 L 38 44" stroke={featureColor} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 68 39 L 52 44" stroke={featureColor} strokeWidth="2.4" strokeLinecap="round" />
        {open(32, 50)} {open(58, 50)}
        <path d="M 29 70 Q 45 60 61 70" stroke={featureColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    ),
    good: (
      <>
        {open(32, 48)} {open(58, 48)}
        {cheeks}
        <path d="M 30 63 Q 45 73 60 63" stroke={featureColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    ),
    calm: (
      <>
        {closedEye(25, 49, 39)} {closedEye(51, 49, 65)}
        <path d="M 33 64 Q 45 69 57 64" stroke={featureColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>
    ),
    sad: (
      <>
        {/* Drooping brows */}
        <path d="M 24 42 L 38 38" stroke={featureColor} strokeWidth="2" strokeLinecap="round" />
        <path d="M 66 42 L 52 38" stroke={featureColor} strokeWidth="2" strokeLinecap="round" />
        {open(32, 49)} {open(58, 49)}
        {/* Teardrop */}
        <ellipse cx="60" cy="59" rx="2.2" ry="3.5" fill="#8ECAE6" opacity="0.85" />
        <path d="M 28 70 Q 45 60 62 70" stroke={featureColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    ),
  };

  return (
    <div
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select mood: ${mood.label}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      {selected && <SpeechBubble label={mood.label} />}

      {selected && (
        <div
          style={{
            position: "absolute",
            inset: "-4px",
            borderRadius: "44%",
            boxShadow: "0 16px 40px rgba(33,158,188,0.32)",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}

      <svg
        viewBox="0 0 90 115"
        width="90"
        height="115"
        style={{ position: "relative", zIndex: 1, overflow: "visible" }}
      >
        {/* Hat */}
        <rect x="15" y="4" width="60" height="19" rx="9.5" fill={hatColor} />
        {/* Body */}
        <rect x="8" y="22" width="74" height="72" rx="28" fill={bodyColor} />
        {/* Legs */}
        <rect x="21" y="89" width="15" height="18" rx="7.5" fill={legColor} />
        <rect x="54" y="89" width="15" height="18" rx="7.5" fill={legColor} />
        {/* Face features */}
        {faces[mood.id]}
      </svg>
    </div>
  );
}

/* ─── Main Mood Section ─── */
export default function MoodSection() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const [selectedMood, setSelectedMood] = useState<MoodId>("good");
  const [activeTab, setActiveTab] = useState<TabId>("mindfulness");
  const [msgVisible, setMsgVisible] = useState(true);

  /* Fade message on mood change */
  const handleMoodSelect = (id: MoodId) => {
    setMsgVisible(false);
    setTimeout(() => { setSelectedMood(id); setMsgVisible(true); }, 120);
  };

  const serif = "var(--font-playfair, 'Playfair Display', Georgia, serif)";
  const sans = "var(--font-inter, system-ui, sans-serif)";
  const hs = "clamp(1.6rem, 2.8vw, 2.2rem)";

  const currentMsg = copy.mood.moods[selectedMood];
  const tabs = copy.mood.tabs;

  return (
    <>
      {/* ── Scoped keyframes ── */}
      <style>{`
        @keyframes bobFloat {
          0%,100% { transform: scale(1.2) translateY(-15px); }
          50%      { transform: scale(1.2) translateY(-22px); }
        }
        .mood-char-row { display: flex; justify-content: center; align-items: flex-end; gap: 48px; }
        @media (max-width: 600px) {
          .mood-char-row { gap: 20px; }
        }
        .mood-tab { transition: background 0.25s ease, color 0.25s ease; }
        .mood-tab:hover { opacity: 0.88; }
      `}</style>

      <section
        id="mood"
        aria-label="How are you feeling today?"
        style={{
          background: "linear-gradient(180deg, var(--sky-mist) 0%, var(--sky-light) 100%)",
          padding: "100px clamp(24px,5vw,56px)",
          textAlign: "center",
        }}
      >
        {/* ───── LARGE MOOD QUESTION ───── */}
        <div style={{ marginTop: "0px", lineHeight: 1.1 }}>
          <h3
            style={{
              fontFamily: serif,
              margin: 0,
              fontSize: "clamp(3rem,6vw,5rem)",
            }}
          >
            <span style={{ color: C.muted, fontWeight: 400 }}>{copy.mood.title1} </span>
            <span style={{ color: C.dark, fontWeight: 700 }}>{copy.mood.title2}</span>
            <br />
            <span style={{ color: C.muted, fontWeight: 400 }}>{copy.mood.title3} </span>
            <span style={{ color: C.dark, fontWeight: 400, fontStyle: "italic" }}>{copy.mood.title4}</span>
          </h3>
        </div>

        {/* ───── MOOD CHARACTER ROW ───── */}
        <div className="mood-char-row" style={{ marginTop: "72px" }}>
          {MOODS.map((mood) => (
            <Character
              key={mood.id}
              mood={mood}
              selected={selectedMood === mood.id}
              onClick={() => handleMoodSelect(mood.id)}
            />
          ))}
        </div>

        {/* ───── EMOTION MESSAGE ───── */}
        <div style={{ marginTop: "24px", minHeight: "28px" }}>
          <p
            style={{
              fontFamily: sans,
              fontSize: "15px",
              color: C.msgText,
              margin: 0,
              opacity: msgVisible ? 1 : 0,
              transform: msgVisible ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            {currentMsg}
          </p>
        </div>

        <div
          style={{
            marginTop: "64px",
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab: { id: TabId; emoji: string; title: string; subtitle: string }) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="mood-tab"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 24px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  background: isActive ? C.dark : "transparent",
                  textAlign: "left",
                }}
              >
                {/* Icon container */}
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    fontSize: "20px",
                    flexShrink: 0,
                    background: isActive
                      ? "rgba(255,255,255,0.12)"
                      : `rgba(${parseInt(C.dark.slice(1, 3), 16)},${parseInt(C.dark.slice(3, 5), 16)},${parseInt(C.dark.slice(5, 7), 16)},0.08)`,
                  }}
                >
                  {tab.emoji}
                </span>

                {/* Text */}
                <div>
                  <p
                    style={{
                      fontFamily: sans,
                      fontSize: "14px",
                      fontWeight: 700,
                      margin: "0 0 2px",
                      color: isActive ? "#ffffff" : C.muted,
                    }}
                  >
                    {tab.title}
                  </p>
                  <p
                    style={{
                      fontFamily: sans,
                      fontSize: "12px",
                      margin: 0,
                      color: isActive ? "rgba(255,255,255,0.72)" : C.muted,
                      maxWidth: "190px",
                    }}
                  >
                    {tab.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Responsive hide of float-right subtext on mobile ── */}
        <style>{`
          @media (max-width: 768px) {
            .mood-subtext { display: none !important; }
          }
        `}</style>
      </section>
    </>
  );
}
