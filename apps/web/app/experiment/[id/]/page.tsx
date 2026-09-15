"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getExperiment, updateClarification, runTest, getResult } from "@/lib/api";
import { Experiment, Clarification, TestResult } from "@/lib/api";
import { ExperimentCard } from "@/components/ExperimentCard";
import { ClarifyList } from "@/components/ClarifyList";
import { ResultView } from "@/components/ResultView";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";

type Stage = "clarify" | "define" | "test" | "learn";

export default function ExperimentPage() {
  const params = useParams();
  const router = useRouter();
  const experimentId = params.id as string;

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [stage, setStage] = useState<Stage>("clarify");
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExperiment();
  }, [experimentId]);

  const loadExperiment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { experiment: exp } = await getExperiment(experimentId);
      setExperiment(exp);

      if (exp.status === "TESTED" && exp.result) {
        setResult(exp.result);
        setStage("learn");
      } else if (exp.status === "READY") {
        setStage("test");
      } else if (exp.status === "CLARIFYING") {
        setStage("clarify");
      } else {
        setStage("define");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load experiment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (field: string, value: string) => {
    setError(null);
    try {
      const { clarification, status } = await updateClarification(experimentId, field, value);
      setExperiment((prev) =>
        prev
          ? {
              ...prev,
              status: status as Experiment["status"],
              clarifications: prev.clarifications.map((c) =>
                c.field === field ? clarification : c
              ),
            }
          : null
      );

      if (status === "READY") {
        setStage("test");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update clarification");
      throw err;
    }
  };

  const handleRunTest = async () => {
    if (!experiment || experiment.status !== "READY") return;
    setIsTesting(true);
    setError(null);
    try {
      const { result: testResult } = await runTest(experimentId);
      setResult(testResult);
      setExperiment((prev) => (prev ? { ...prev, status: "TESTED", result: testResult } : null));
      setStage("learn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run backtest");
    } finally {
      setIsTesting(false);
    }
  };

  const handleNewQuestion = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading experiment...</p>
      </div>
    );
  }

  if (error && !experiment) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <Button onClick={handleNewQuestion}>Ask New Question</Button>
      </div>
    );
  }

  if (!experiment) {
    return null;
  }

  const progressSteps: Array<{ id: Stage; label: string }> = [
    { id: "clarify", label: "Clarify" },
    { id: "define", label: "Define" },
    { id: "test", label: "Test" },
    { id: "learn", label: "Learn" },
  ];

  const currentStepIndex = progressSteps.findIndex((s) => s.id === stage);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button variant="secondary" onClick={handleNewQuestion} className={styles.backButton}>
          ← New Question
        </Button>
        <div className={styles.progress}>
          {progressSteps.map((step, index) => (
            <div key={step.id} className={styles.step}>
              <div
                className={`${styles.stepCircle} ${
                  index < currentStepIndex ? styles.completed : index === currentStepIndex ? styles.active : ""
                }`}
              >
                {index < currentStepIndex ? "✓" : index + 1}
              </div>
              <span
                className={`${styles.stepLabel} ${
                  index <= currentStepIndex ? styles.activeLabel : ""
                }`}
              >
                {step.label}
              </span>
              {index < progressSteps.length - 1 && (
                <div
                  className={`${styles.stepLine} ${index < currentStepIndex ? styles.completedLine : ""}`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </header>

      <main className={styles.main}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.content}>
          <ExperimentCard
            experiment={experiment}
            onRunTest={handleRunTest}
            isTesting={isTesting}
            showActions={stage === "test"}
          />

          {stage === "clarify" && experiment.status === "CLARIFYING" && (
            <ClarifyList
              clarifications={experiment.clarifications}
              onConfirm={handleConfirm}
              isLoading={isTesting}
            />
          )}

          {stage === "learn" && result && <ResultView result={result} />}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          Prototype — Not financial advice. Backtest results are hypothetical.
        </p>
      </footer>
    </div>
  );
}