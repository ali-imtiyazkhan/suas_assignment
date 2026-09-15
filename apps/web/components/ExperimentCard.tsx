"use client";

import { Experiment } from "@/lib/api";
import styles from "./ExperimentCard.module.css";

interface ExperimentCardProps {
  experiment: Experiment;
  onRunTest?: () => Promise<void>;
  isTesting?: boolean;
  showActions?: boolean;
}

const fieldLabels: Record<string, string> = {
  instrument: "Instrument",
  condition: "Entry Condition",
  entry: "Entry Rule",
  exit: "Exit Rule",
  holdingPeriodDays: "Holding Period",
  testPeriodStart: "Test Period Start",
  testPeriodEnd: "Test Period End",
  costAssumptions: "Cost Assumptions",
  hypothesis: "Hypothesis",
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getFieldValue = (experiment: Experiment, field: string) => {
  switch (field) {
    case "holdingPeriodDays":
      return experiment.holdingPeriodDays ? `${experiment.holdingPeriodDays} days` : "—";
    case "testPeriodStart":
      return formatDate(experiment.testPeriodStart);
    case "testPeriodEnd":
      return formatDate(experiment.testPeriodEnd);
    case "exit":
      return experiment.exit || "—";
    case "costAssumptions":
      return experiment.costAssumptions || "—";
    default:
      return (experiment as unknown as Record<string, unknown>)[field] as string || "—";
  }
};

const fieldOrder = [
  "instrument",
  "condition",
  "entry",
  "exit",
  "holdingPeriodDays",
  "testPeriodStart",
  "testPeriodEnd",
  "costAssumptions",
  "hypothesis",
];

const statusStyles = {
  DRAFT: "statusDraft",
  CLARIFYING: "statusClarifying",
  READY: "statusReady",
  TESTED: "statusTested",
} as const;

const statusLabels = {
  DRAFT: "Draft",
  CLARIFYING: "Clarifying",
  READY: "Ready to Test",
  TESTED: "Tested",
} as const;

type StatusKey = keyof typeof statusStyles;

export function ExperimentCard({ experiment, onRunTest, isTesting, showActions = true }: ExperimentCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Experiment Definition</h2>
        <span className={`${styles.status} ${styles[statusStyles[experiment.status as StatusKey]]}`}>
          {statusLabels[experiment.status as StatusKey]}
        </span>
      </div>

      <p className={styles.originalQuestion}>"{experiment.question.rawText}"</p>

      <dl className={styles.fields}>
        {fieldOrder.map((field) => (
          <div key={field} className={styles.fieldRow}>
            <dt className={styles.fieldLabel}>{fieldLabels[field]}</dt>
            <dd className={styles.fieldValue}>{getFieldValue(experiment, field)}</dd>
          </div>
        ))}
      </dl>

      {showActions && experiment.status === "READY" && onRunTest && (
        <div className={styles.actions}>
          <button
            className={`${styles.runButton} ${isTesting ? styles.testing : ""}`}
            onClick={onRunTest}
            disabled={isTesting}
          >
            {isTesting ? "Running Backtest..." : "Run Backtest"}
          </button>
        </div>
      )}

      {showActions && experiment.status === "TESTED" && (
        <div className={styles.actions}>
          <span className={styles.testedLabel}>✓ Backtest completed</span>
        </div>
      )}
    </div>
  );
}