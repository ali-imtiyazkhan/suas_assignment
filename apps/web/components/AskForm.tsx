"use client";

import { useState, FormEvent } from "react";
import { Button } from "@repo/ui/button";
import styles from "./AskForm.module.css";

interface AskFormProps {
  onSubmit: (rawText: string) => Promise<void>;
  isLoading?: boolean;
}

export function AskForm({ onSubmit, isLoading }: AskFormProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter a trading question");
      return;
    }

    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process question");
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <label htmlFor="question" className={styles.label}>
          What's your trading question?
        </label>
        <textarea
          id="question"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Does buying NIFTY after a sharp fall work?"
          rows={3}
          disabled={isLoading}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <Button type="submit" disabled={isLoading || !text.trim()}>
        {isLoading ? "Analyzing..." : "Analyze Question"}
      </Button>
      <p className={styles.hint}>
        Try: "Does buying NIFTY after a 2% drop work over 10 days?"
      </p>
    </form>
  );
}