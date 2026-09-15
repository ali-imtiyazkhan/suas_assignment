import { describe, it, expect } from "vitest";
import { fallbackGenerate } from "./generateSummary";

describe("generateSummary", () => {
  describe("fallbackGenerate", () => {
    const experiment = {
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-01-01"),
      testPeriodEnd: new Date("2024-12-31"),
    };

    it("generates factual summaryText with correct numbers", () => {
      const result = {
        sampleSize: 47,
        avgReturnPct: 0.62,
        baselineReturnPct: 0.11,
        hitRatePct: 53.2,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.summaryText).toContain("47 matching events");
      expect(summary.summaryText).toContain("+0.62%");
      expect(summary.summaryText).toContain("+0.11%");
      expect(summary.summaryText).toContain("53.2%");
      expect(summary.summaryText).toContain("2021-01-01");
      expect(summary.summaryText).toContain("2024-12-31");
    });

    it("generates conclusionText with caveats for small sample", () => {
      const result = {
        sampleSize: 20,
        avgReturnPct: 0.5,
        baselineReturnPct: 0.1,
        hitRatePct: 50,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.conclusionText).toContain("Very small sample");
      expect(summary.conclusionText).toContain("20 events");
      expect(summary.conclusionText).toContain("Costs and slippage");
      expect(summary.conclusionText).toContain("Look-ahead bias");
      expect(summary.conclusionText).toContain("research lead");
    });

    it("generates conclusionText for adequate sample with positive edge", () => {
      const result = {
        sampleSize: 150,
        avgReturnPct: 1.2,
        baselineReturnPct: 0.1,
        hitRatePct: 55,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.conclusionText).toContain("Adequate sample size");
      expect(summary.conclusionText).toContain("150 events");
      expect(summary.conclusionText).toContain("Meaningful positive edge");
      expect(summary.conclusionText).toContain("1.10%");
    });

    it("generates conclusionText for negative edge", () => {
      const result = {
        sampleSize: 100,
        avgReturnPct: -0.3,
        baselineReturnPct: 0.2,
        hitRatePct: 45,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.conclusionText).toContain("Negative edge");
      expect(summary.conclusionText).toContain("-0.50%");
    });

    it("includes nextSteps", () => {
      const result = {
        sampleSize: 50,
        avgReturnPct: 0.5,
        baselineReturnPct: 0.1,
        hitRatePct: 52,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.nextSteps).toBeDefined();
      expect(summary.nextSteps).toContain("Test different fall thresholds");
      expect(summary.nextSteps).toContain("longer holding periods");
      expect(summary.nextSteps).toContain("transaction cost sensitivity");
      expect(summary.nextSteps).toContain("out-of-sample");
    });

    it("formats negative returns correctly in summaryText", () => {
      const result = {
        sampleSize: 30,
        avgReturnPct: -0.25,
        baselineReturnPct: 0.1,
        hitRatePct: 48,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.summaryText).toContain("-0.25%");
      expect(summary.summaryText).not.toContain("+-0.25%");
    });

    it("uses different conclusion for limited sample (30-100)", () => {
      const result = {
        sampleSize: 50,
        avgReturnPct: 0.3,
        baselineReturnPct: 0.1,
        hitRatePct: 51,
      };

      const summary = fallbackGenerate(experiment, result);

      expect(summary.conclusionText).toContain("Limited sample");
      expect(summary.conclusionText).toContain("50 events");
    });
  });
});