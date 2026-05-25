import { ScreenerShell } from "./ScreenerShell";

export function ASRSScreener() {
  return (
    <ScreenerShell
      type="ASRS"
      namespace="screeners.asrs"
      max={24}
      severity={(score) => {
        if (score <= 8) return { label: "Low", recommendation: "Responses do not strongly suggest ADHD symptoms.", color: "green" };
        if (score <= 13) return { label: "Possible", recommendation: "Consider tracking focus, time management, and rest.", color: "yellow" };
        if (score <= 18) return { label: "Elevated", recommendation: "A clinical assessment may clarify next steps.", color: "orange" };
        return { label: "High", recommendation: "Consider an ADHD-focused evaluation with a professional.", color: "red" };
      }}
    />
  );
}
