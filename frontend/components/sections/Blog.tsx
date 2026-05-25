"use client";

import { useEffect, useRef } from "react";
import { ArticleCard } from "@/components/ui/blog-card";
import { useLocale } from "next-intl";
import { siteCopy, type SiteLocale } from "@/lib/siteCopy";

/* ─── Colour tokens (CSS vars) ─── */
const C = {
  muted:   "var(--sky)",   // Sky Blue
  dark:    "var(--prussian)",   // Prussian Blue
  sub:     "var(--prussian-soft)",   // Muted Text
};

const serif = "var(--font-playfair,'Playfair Display',Georgia,serif)";
const sans  = "var(--font-inter,system-ui,sans-serif)";

const BLOG_ARTICLES = [
  {
    headline: "Nurturing Mindfulness in Daily Life",
    excerpt: "Discover simple, practical techniques to cultivate deep presence, reduce daily work stress, and restore emotional stability in under five minutes a day.",
    cover: "/meditating_woman.png",
    tag: "Mindfulness",
    readingTime: 300, // 5 min read
    writer: "Dr. Ananya Sen",
    publishedAt: new Date("2026-05-18"),
  },
  {
    headline: "Understanding Stress: A Compassionate Guide",
    excerpt: "Stress is a natural indicator, not a failure. Learn how to map your physical stress triggers and respond to them with kindness and healthy routines.",
    cover: "/thinking_woman.png",
    tag: "Self-Care",
    readingTime: 240, // 4 min read
    writer: "Siddharth Mehta",
    publishedAt: new Date("2026-05-12"),
  },
  {
    headline: "The Importance of Emotional Screening",
    excerpt: "Why regular self-assessments and emotional tracking are the cornerstones of long-term psychological resilience. Demystified with the latest clinical data.",
    cover: "/smiling_woman.png",
    tag: "Mental Health",
    readingTime: 360, // 6 min read
    writer: "Dr. Kabir Roy",
    publishedAt: new Date("2026-05-05"),
  },
];

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
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, delay, fromX, fromY]);
}

export default function BlogSection() {
  const locale = useLocale();
  const copy = siteCopy[locale as SiteLocale] ?? siteCopy.en;
  const headerRef = useRef<HTMLDivElement>(null);
  const card1Ref  = useRef<HTMLDivElement>(null);
  const card2Ref  = useRef<HTMLDivElement>(null);
  const card3Ref  = useRef<HTMLDivElement>(null);
  const articles = BLOG_ARTICLES.map((article, index) => ({ ...article, ...copy.blog.articles[index] }));

  useScrollReveal(headerRef as React.RefObject<HTMLElement>, { fromX: -20 });
  useScrollReveal(card1Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0 });
  useScrollReveal(card2Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0.1 });
  useScrollReveal(card3Ref  as React.RefObject<HTMLElement>, { fromY: 30, delay: 0.2 });

  return (
    <section
      id="blog"
      aria-label="Recent mental health articles"
      style={{
        background: "linear-gradient(180deg, var(--sky-mist) 0%, var(--sky-light) 100%)",
        padding:    "100px clamp(24px,5vw,56px)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* ───── HEADER ROW ───── */}
        <div
          ref={headerRef}
          style={{
            textAlign: "center",
            marginBottom: "56px",
          }}
        >
          <h2 style={{ fontFamily: serif, margin: 0, lineHeight: 1.15 }}>
            <span style={{ fontSize: "clamp(2.5rem,5vw,4rem)", color: C.muted, fontWeight: 400 }}>
              {copy.blog.title1}{" "}
            </span>
            <span style={{ fontSize: "clamp(2.5rem,5vw,4rem)", color: C.dark, fontWeight: 700 }}>
              {copy.blog.title2}
            </span>
            <br />
            <span style={{ fontSize: "clamp(2.5rem,5vw,4rem)", color: C.dark, fontWeight: 400, fontStyle: "italic" }}>
              {copy.blog.title3}
            </span>
          </h2>
          <p style={{ fontFamily: sans, fontSize: "15px", color: C.sub, marginTop: "16px", maxWidth: "480px", margin: "16px auto 0", lineHeight: 1.6 }}>
            {copy.blog.intro}
          </p>
        </div>

        {/* ───── ARTICLES GRID ───── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          <div ref={card1Ref} className="w-full flex justify-center">
            <ArticleCard {...articles[0]} clampLines={3} />
          </div>
          <div ref={card2Ref} className="w-full flex justify-center">
            <ArticleCard {...articles[1]} clampLines={3} />
          </div>
          <div ref={card3Ref} className="w-full flex justify-center">
            <ArticleCard {...articles[2]} clampLines={3} />
          </div>
        </div>
      </div>
    </section>
  );
}
