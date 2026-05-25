import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent dark:bg-card md:text-sm",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
