"use client";

import { useState, FormEvent } from "react";
import { Clarification } from "@/lib/api";
import { Button } from "@repo/ui/button";
import styles from "./ClarifyList.module.css";

interface ClarifyListProps {
  clarifications: Clarification[];
  onConfirm: (field: string, value: string) => Promise<void>;
  isLoading?: boolean;
}

const fieldLabels: Record<string, string> = {
  instrument: "Instrument",
  condition: "Entry Condition",
  entry: "Entry Rule",
  exit: "Exit Rule",
  holdingPeriodDays: "Holding Period (days)",
  testPeriodStart: "Test Period Start",
  testPeriodEnd: "Test Period End",
  costAssumptions: "Cost Assumptions",
};

const fieldTypes: Record<string, "text" | "number" | "date"> = {
  holdingPeriodDays: "number",
  testPeriodStart: "date",
  testPeriodEnd: "date",
};

export function ClarifyList({ clarifications, onConfirm, isLoading }: ClarifyListProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const userClarifications = clarifications.filter((c) => c.source !== "ASSUMED");
  const assumedClarifications = clarifications.filter((c) => c.source === "ASSUMED");

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: FormEvent, field: string) => {
    e.preventDefault();
    const value = values[field]?.trim();
    if (!value) {
      setErrors((prev) => ({ ...prev, [field]: "This field is required" }));
      return;
    }
    setErrors((prev) => ({ ...prev, [field]: "" }));
    try {
      await onConfirm(field, value);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [field]: err instanceof Error ? err.message : "Failed to update" }));
    }
  };

  const getDefaultValue = (clarification: Clarification) => {
    if (values[clarification.field]) return values[clarification.field];
    return clarification.value;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Clarify Your Experiment</h2>
      <p className={styles.description}>
        We've made some assumptions for missing details. Please review and confirm or edit each one.
      </p>

      {assumedClarifications.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Assumptions to Confirm</h3>
          <div className={styles.list}>
            {assumedClarifications.map((clarification) => (
              <div key={clarification.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <label className={styles.fieldLabel} htmlFor={clarification.field}>
                    {fieldLabels[clarification.field] || clarification.field}
                  </label>
                  <span className={styles.badgeAssumed}>Assumed</span>
                </div>
                <p className={styles.promptText}>{clarification.promptText}</p>
                <form onSubmit={(e) => handleSubmit(e, clarification.field)} className={styles.formRow}>
                  <input
                    id={clarification.field}
                    type={fieldTypes[clarification.field] || "text"}
                    className={styles.input}
                    value={getDefaultValue(clarification)}
                    onChange={(e) => handleChange(clarification.field, e.target.value)}
                    disabled={isLoading}
                  />
                  <Button type="submit" size="sm" disabled={isLoading}>
                    Confirm
                  </Button>
                </form>
                {errors[clarification.field] && (
                  <p className={styles.fieldError}>{errors[clarification.field]}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {userClarifications.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Confirmed Values</h3>
          <div className={styles.list}>
            {userClarifications.map((clarification) => (
              <div key={clarification.id} className={styles.itemConfirmed}>
                <div className={styles.itemHeader}>
                  <label className={styles.fieldLabel}>
                    {fieldLabels[clarification.field] || clarification.field}
                  </label>
                  <span className={styles.badgeConfirmed}>
                    {clarification.source === "USER_CONFIRMED" ? "Confirmed" : "Provided"}
                  </span>
                </div>
                <p className={styles.confirmedValue}>{clarification.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {assumedClarifications.length === 0 && (
        <div className={styles.ready}>
          <p>All details confirmed. Ready to run the backtest.</p>
        </div>
      )}
    </div>
  );
}