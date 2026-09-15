"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuestion } from "@/lib/api";
import { AskForm } from "@/components/AskForm";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (rawText: string) => {
    setIsLoading(true);
    try {
      const { experiment } = await submitQuestion(rawText);
      router.push(`/experiment/${experiment.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#0066cc"/>
            <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className={styles.title}>AI Trading Research Assistant</h1>
        <p className={styles.subtitle}>
          Turn vague trading questions into structured, testable experiments with historical data.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <AskForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        <div className={styles.examples}>
          <h3 className={styles.examplesTitle}>Example Questions</h3>
          <ul className={styles.examplesList}>
            <li>"Does buying NIFTY after a sharp fall work?"</li>
            <li>"What if I buy BankNIFTY when it drops 3% in a day?"</li>
            <li>"Is selling NIFTY calls after a 2% rally profitable over 5 days?"</li>
            <li>"Does buying the dip on NIFTY work with a 10-day hold?"</li>
          </ul>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          Prototype for AI Full-Stack Developer Intern assignment —
          <span className={styles.disclaimer}>
            Not financial advice. Backtest results are hypothetical and may not reflect real-world performance.
          </span>
        </p>
      </footer>
    </div>
  );
}