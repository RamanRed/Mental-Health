"use client";

import Hero            from "@/components/sections/Hero";
import About           from "@/components/sections/About";
import Mood            from "@/components/sections/Mood";
import Features        from "@/components/sections/Features";
import Blog            from "@/components/sections/Blog";
import Footer          from "@/components/sections/Footer";

export default function LandingPage() {
  return (
    <main className="relative w-full">
      <Hero />
      <About />
      <Mood />
      <Features />
      <Blog />
      <Footer />
    </main>
  );
}
