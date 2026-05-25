import { ScreenerShell } from "./ScreenerShell";

export function PHQ9Screener() {
  return (
    <ScreenerShell
      type="PHQ9"
      namespace="screeners.phq9"
      max={27}
      severity={(score) => {
        if (score <= 4) return { label: "Minimal", recommendation: "Continue self-care and monitor changes.", color: "green" };
        if (score <= 9) return { label: "Mild", recommendation: "Consider guided support and repeat the screener soon.", color: "yellow" };
        if (score <= 14) return { label: "Moderate", recommendation: "Professional support may be helpful.", color: "orange" };
        if (score <= 19) return { label: "Moderately severe", recommendation: "Please consider speaking with a qualified professional.", color: "orange" };
        return { label: "Severe", recommendation: "Seek professional support promptly. If you feel unsafe, call iCall 9152987821.", color: "red" };
      }}
    />
  );
}
