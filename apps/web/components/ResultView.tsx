"use client";

import { TestResult } from "@/lib/api";
import styles from "./ResultView.module.css";

interface ResultViewProps {
  result: TestResult;
}

const formatPct = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

export function ResultView({ result }: ResultViewProps) {
  const edge = result.avgReturnPct - result.baselineReturnPct;
  const edgeColor = edge > 0 ? "#16a34a" : edge < 0 ? "#dc2626" : "#666";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Backtest Results</h2>
        <span className={styles.dataSource}>Data: {result.dataSource}</span>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sample Size</div>
          <div className={styles.statValue}>{result.sampleSize}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Return</div>
          <div className={styles.statValue} style={{ color: result.avgReturnPct >= 0 ? "#16a34a" : "#dc2626" }}>
            {formatPct(result.avgReturnPct)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Baseline Return</div>
          <div className={styles.statValue}>{formatPct(result.baselineReturnPct)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Hit Rate</div>
          <div className={styles.statValue}>{result.hitRatePct ? `${result.hitRatePct.toFixed(1)}%` : "—"}</div>
        </div>
        <div className={`${styles.statCard} ${styles.edgeCard}`}>
          <div className={styles.statLabel}>Edge vs Baseline</div>
          <div className={styles.statValue} style={{ color: edgeColor }}>
            {formatPct(edge)}
          </div>
        </div>
      </div>

      <div className={styles.summarySection}>
        <div className={styles.box}>
          <div className={styles.boxHeader}>
            <span className={styles.boxIcon}>📊</span>
            <h3 className={styles.boxTitle}>What the Data Shows</h3>
          </div>
          <p className={styles.boxText}>{result.summaryText}</p>
        </div>

        <div className={styles.box}>
          <div className={styles.boxHeader}>
            <span className={styles.boxIcon}>💭</span>
            <h3 className={styles.boxTitle}>What We Conclude</h3>
          </div>
          <p className={styles.boxText}>{result.conclusionText}</p>
        </div>
      </div>

      {result.nextSteps && (
        <div className={styles.nextSteps}>
          <h3 className={styles.nextStepsTitle}>What to Investigate Next</h3>
          <p className={styles.nextStepsText}>{result.nextSteps}</p>
        </div>
      )}
    </div>
  );
}