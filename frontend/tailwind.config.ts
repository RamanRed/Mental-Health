import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./store/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "#4F46E5", foreground: "#FFFFFF" },
        accent: { DEFAULT: "#0D9488", foreground: "#FFFFFF" },
        success: "#22C55E",
        warning: "#EAB308",
        alert: "#F97316",
        danger: "#EF4444",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        // MindWell Custom Theme Colors (mapped to new palette)
        mist: "#eaf6fb", // var(--sky-mist)
        powder: "#d4edf7", // var(--sky-light)
        slate: "#1a4a6b", // var(--prussian-muted)
        navy: "#2d6a8f", // var(--prussian-soft)
        cloud: "#FAFCFF",
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
      },
      fontFamily: {
        sans: ["var(--font-noto)", "system-ui", "sans-serif"],
        "dm-sans": ["var(--font-dm-sans)", "sans-serif"],
        "dm-serif": ["var(--font-dm-serif)", "serif"],
      },
      boxShadow: {
        soft: "0 14px 40px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

