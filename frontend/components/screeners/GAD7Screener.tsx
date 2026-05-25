import { ScreenerShell } from "./ScreenerShell";

export function GAD7Screener() {
  return (
    <ScreenerShell
      type="GAD7"
      namespace="screeners.gad7"
      max={21}
      severity={(score) => {
        if (score <= 4) return { label: "Minimal", recommendation: "Keep using grounding and healthy routines.", color: "green" };
        if (score <= 9) return { label: "Mild", recommendation: "Track patterns and consider supportive exercises.", color: "yellow" };
        if (score <= 14) return { label: "Moderate", recommendation: "A professional conversation may help reduce anxiety.", color: "orange" };
        return { label: "Severe", recommendation: "Please seek professional support soon.", color: "red" };
      }}
    />
  );
}
