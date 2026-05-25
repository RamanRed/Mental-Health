import { ScreenerShell } from "./ScreenerShell";

export function AQ10Screener() {
  const autismDirection = [1, 1, 1, 1, 0, 1, 0, 1, 0, 0];
  return (
    <ScreenerShell
      type="AQ10"
      namespace="screeners.aq10"
      max={10}
      score={(answers) => answers.reduce((sum, answer, index) => sum + (answer === autismDirection[index] ? 1 : 0), 0)}
      severity={(score) => {
        if (score < 6) return { label: "Below threshold", recommendation: "AQ-10 score is below the usual referral threshold.", color: "green" };
        return { label: "Above threshold", recommendation: "A fuller autism assessment may be worth discussing with a clinician.", color: "orange" };
      }}
    />
  );
}
