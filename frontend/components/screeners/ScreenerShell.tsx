"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { patientApi } from "@/lib/api";
import { severityColor, type RiskLevel } from "@/lib/utils";

type Option = { label: string; value: number };
type Result = { score: number; max: number; severity: string; recommendation: string; color?: RiskLevel };

export function ScreenerShell({
  type,
  namespace,
  max,
  score,
  severity,
  options,
}: {
  type: string;
  namespace: string;
  max: number;
  score?: (answers: number[]) => number;
  severity: (score: number, answers: number[]) => { label: string; recommendation: string; color?: RiskLevel };
  options?: Option[];
}) {
  const t = useTranslations(namespace);
  const common = useTranslations("screeners.common");
  const questions = t.raw("questions") as string[];
  const scale = options ?? (t.raw("options") as Option[]);
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [result, setResult] = useState<Result | null>(null);
  const answered = answers.filter((answer) => answer >= 0).length;
  const current = Math.min(answered + 1, questions.length);

  const canSubmit = useMemo(() => answers.every((answer) => answer >= 0), [answers]);

  async function submit() {
    const total = score ? score(answers) : answers.reduce((sum, answer) => sum + answer, 0);
    const level = severity(total, answers);
    setResult({ score: total, max, severity: level.label, recommendation: level.recommendation, color: level.color });
    await patientApi.submitAssessment(type, {
      responses: answers.map((answer, index) => ({ question_id: `${type}-${index + 1}`, score: answer })),
      total_score: total,
      severity: level.label,
      administered_at: new Date().toISOString(),
    }).catch(() => undefined);
  }

  return (
    <CollapsibleSection title={t("title")}>
      <div className="space-y-5">
        <p className="text-sm leading-6 text-muted-foreground">{t("instructions")}</p>
        <div className="text-sm font-semibold text-muted-foreground">{common("progress", { current, total: questions.length })}</div>
        {questions.map((question, index) => (
          <fieldset key={question} className="space-y-3 rounded-lg border bg-white p-3 dark:bg-card">
            <legend className="text-sm font-semibold">{index + 1}. {question}</legend>
            <div className="grid gap-2">
              {scale.map((option) => (
                <label key={`${index}-${option.value}-${option.label}`} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted">
                  <input
                    type="radio"
                    className="h-5 w-5 accent-primary"
                    name={`${type}-${index}`}
                    value={option.value}
                    checked={answers[index] === option.value}
                    onChange={() => setAnswers((prev) => prev.map((answer, itemIndex) => (itemIndex === index ? option.value : answer)))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <Button type="button" className="w-full" disabled={!canSubmit} onClick={submit}>{common("submit")}</Button>
        {result ? (
          <div className="rounded-lg border bg-muted p-4" role="status" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xl font-bold">{common("score", { score: result.score, max: result.max })}</p>
              <RiskBadge level={result.color ?? severityColor(result.score, result.max)} label={result.severity} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.recommendation}</p>
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
