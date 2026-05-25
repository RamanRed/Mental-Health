// components/ui/gradient-card.tsx

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils"; // Your shadcn/ui utility for merging classes

// Define variants for the card's overall style using cva
const cardVariants = cva(
  "group relative flex flex-col justify-between h-full w-full overflow-hidden rounded-3xl p-8 border backdrop-blur-sm transition-all duration-500",
  {
    variants: {
      gradient: {
        orange: "bg-gradient-to-br from-amber-50 via-amber-100/60 to-orange-100/30 border-amber-200/50 shadow-[6px_6px_20px_rgba(251,133,0,0.05),_-6px_-6px_20px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_32px_rgba(251,133,0,0.12),_-12px_-12px_32px_rgba(255,255,255,1)] hover:border-amber-300/80 text-orange-700",
        gray: "bg-gradient-to-br from-slate-50 via-slate-100/60 to-blue-100/20 border-slate-200/40 shadow-[6px_6px_20px_rgba(2,48,71,0.04),_-6px_-6px_20px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_32px_rgba(2,48,71,0.1),_-12px_-12px_32px_rgba(255,255,255,1)] hover:border-slate-300/80 text-slate-700",
        purple: "bg-gradient-to-br from-indigo-50 via-indigo-100/60 to-purple-100/20 border-indigo-200/40 shadow-[6px_6px_20px_rgba(33,158,188,0.04),_-6px_-6px_20px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_32px_rgba(33,158,188,0.1),_-12px_-12px_32px_rgba(255,255,255,1)] hover:border-indigo-300/80 text-indigo-700",
        green: "bg-gradient-to-br from-teal-50 via-teal-100/60 to-emerald-100/20 border-emerald-200/40 shadow-[6px_6px_20px_rgba(33,158,188,0.04),_-6px_-6px_20px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_32px_rgba(33,158,188,0.1),_-12px_-12px_32px_rgba(255,255,255,1)] hover:border-emerald-300/80 text-teal-700",
      },
    },
    defaultVariants: {
      gradient: "gray",
    },
  }
);

// Define the props interface for type safety and reusability
export interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string; // Expecting a hex color string, e.g., "#FF5733"
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageUrl?: string;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, gradient, badgeText, badgeColor, title, description, ctaText, ctaHref, imageUrl, ...props }, ref) => {
    
    // Animation variants for framer-motion (smooth soft hover raise)
    const cardAnimation = {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.025, y: -6 },
    };

    // Helper to render high-end abstract SVGs dynamically based on title
    const renderAbstractPattern = () => {
      const t = title.toLowerCase();
      if (t.includes("call")) {
        // Concentric ripples / waves
        return (
          <svg viewBox="0 0 200 200" className="absolute -right-12 -bottom-12 w-52 h-52 opacity-[0.08] pointer-events-none text-current transition-all duration-700 group-hover:scale-110 group-hover:rotate-12">
            <circle cx="100" cy="100" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" />
            <circle cx="100" cy="100" r="100" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      } else if (t.includes("chatbot")) {
        // Neural network connections
        return (
          <svg viewBox="0 0 200 200" className="absolute -right-8 -bottom-8 w-48 h-48 opacity-[0.08] pointer-events-none text-current transition-all duration-700 group-hover:scale-115 group-hover:rotate-6">
            <path d="M40 60 L100 30 L160 60 L140 130 L60 130 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M100 30 L100 100 L140 130 L60 130 L100 100 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="40" cy="60" r="6" fill="currentColor" />
            <circle cx="100" cy="30" r="6" fill="currentColor" />
            <circle cx="160" cy="60" r="6" fill="currentColor" />
            <circle cx="140" cy="130" r="6" fill="currentColor" />
            <circle cx="60" cy="130" r="6" fill="currentColor" />
            <circle cx="100" cy="100" r="5" fill="currentColor" />
            <line x1="40" y1="60" x2="100" y2="100" stroke="currentColor" strokeWidth="1.5" />
            <line x1="160" y1="60" x2="100" y2="100" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      } else if (t.includes("tracking") || t.includes("screening") || t.includes("mood")) {
        // Smooth sine wave emotion curves
        return (
          <svg viewBox="0 0 200 200" className="absolute -right-8 -bottom-4 w-52 h-44 opacity-[0.09] pointer-events-none text-current transition-all duration-700 group-hover:scale-110 group-hover:-translate-x-2">
            <path d="M 0 80 Q 40 20 80 80 T 160 80 T 240 80" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M 0 100 Q 40 40 80 100 T 160 100 T 240 100" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            <path d="M 0 120 Q 40 60 80 120 T 160 120 T 240 120" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          </svg>
        );
      } else if (t.includes("communication") || t.includes("instant") || t.includes("doctor")) {
        // Radar waves / geographical coordinates
        return (
          <svg viewBox="0 0 200 200" className="absolute -right-12 -bottom-12 w-52 h-52 opacity-[0.08] pointer-events-none text-current transition-all duration-700 group-hover:scale-110 group-hover:rotate-45">
            <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="1.5" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="100" y1="100" x2="165" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 135 65 A 50 50 0 0 1 165 100" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        );
      } else {
        // Multilingual mesh globe
        return (
          <svg viewBox="0 0 200 200" className="absolute -right-12 -bottom-12 w-52 h-52 opacity-[0.08] pointer-events-none text-current transition-all duration-700 group-hover:scale-115 group-hover:rotate-90">
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2" />
            <ellipse cx="100" cy="100" rx="80" ry="25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="100" cy="100" rx="80" ry="55" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="100" cy="100" rx="25" ry="80" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="100" cy="100" rx="55" ry="80" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      }
    };

    return (
      <motion.div
        variants={cardAnimation}
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="h-full"
        ref={ref}
      >
        <div
          className={cn(cardVariants({ gradient }), className)}
          {...props}
        >
          {/* Decorative premium abstract geometric background pattern */}
          {renderAbstractPattern()}

          {/* Glowing Blur Orbs inside the card for premium depths */}
          <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 bg-white pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-[0.14] bg-current pointer-events-none" />

          {/* Premium gloss shine sweep overlay */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
            <div className="absolute top-0 -left-[100%] w-[60%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 transition-all duration-[1200ms] ease-in-out group-hover:left-[160%]" />
          </div>

          {/* Card Content */}
          <div className="z-10 flex flex-col h-full relative">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-800/90 shadow-sm border border-white/50 backdrop-blur-sm w-fit">
              <span 
                className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]" 
                style={{ backgroundColor: badgeColor }}
              />
              {badgeText}
            </div>

            {/* Title and Description */}
            <div className="flex-grow">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-3.5 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
                {title}
              </h3>
              <p className="text-slate-600/90 text-[14.5px] leading-relaxed max-w-[290px] font-medium">
                {description}
              </p>
            </div>
            
            {/* Call to Action Link */}
            <a
              href={ctaHref}
              className="group/cta mt-8 inline-flex items-center gap-2.5 text-[13.5px] font-bold tracking-wide uppercase text-slate-800 hover:text-slate-900 w-fit"
            >
              {ctaText}
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/80 border border-slate-200/50 shadow-sm group-hover/cta:bg-slate-900 group-hover/cta:text-white transition-all duration-300">
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
              </span>
            </a>
          </div>
        </div>
      </motion.div>
    );
  }
);
GradientCard.displayName = "GradientCard";

export { GradientCard, cardVariants };
