import { ScreenerShell } from "./ScreenerShell";

export function MDQScreener() {
  return (
    <ScreenerShell
      type="MDQ"
      namespace="screeners.mdq"
      max={13}
      severity={(score) => {
        if (score < 7) return { label: "Below threshold", recommendation: "Responses are below the common MDQ symptom threshold.", color: "green" };
        return { label: "Positive screen", recommendation: "Please discuss these mood changes with a qualified professional.", color: "orange" };
      }}
    />
  );
}
