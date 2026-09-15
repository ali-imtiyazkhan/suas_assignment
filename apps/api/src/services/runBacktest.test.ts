import { describe, it, expect, beforeAll } from "vitest";
import { runBacktest } from "./runBacktest";
import { join } from "path";

describe("runBacktest", () => {
  const csvPath = join(process.cwd(), "src", "data", "nifty_daily.csv");

  it("runs backtest with basic parameters and returns valid results", () => {
    const result = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath);

    expect(result.dataSource).toBe("nifty_daily.csv");
    expect(result.sampleSize).toBeGreaterThan(0);
    expect(typeof result.avgReturnPct).toBe("number");
    expect(typeof result.baselineReturnPct).toBe("number");
    expect(typeof result.hitRatePct).toBe("number");
    expect(result.hitRatePct).toBeGreaterThanOrEqual(0);
    expect(result.hitRatePct).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.events.length).toBe(result.sampleSize);
  });

  it("each event has correct structure", () => {
    const result = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath);

    for (const event of result.events) {
      expect(event.entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.exitDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof event.entryPrice).toBe("number");
      expect(typeof event.exitPrice).toBe("number");
      expect(typeof event.returnPct).toBe("number");
      expect(event.entryPrice).toBeGreaterThan(0);
      expect(event.exitPrice).toBeGreaterThan(0);
    }
  });

  it("handles different holding periods", () => {
    const result5 = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath);

    const result10 = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 10 days",
      holdingPeriodDays: 10,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath);

    expect(result5.sampleSize).toBeGreaterThanOrEqual(result10.sampleSize);
  });

  it("handles different fall thresholds", () => {
    const result1p5 = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 1.5% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath);

    const result2 = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath);

    expect(result1p5.sampleSize).toBeGreaterThanOrEqual(result2.sampleSize);
  });

  it("applies cost assumptions to reduce returns", () => {
    const resultNoCost = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0% slippage per trade",
    }, csvPath);

    const resultWithCost = runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2021-07-01"),
      testPeriodEnd: new Date("2024-12-31"),
      costAssumptions: "0.5% slippage per trade",
    }, csvPath);

    expect(resultWithCost.avgReturnPct).toBeLessThan(resultNoCost.avgReturnPct);
  });

  it("throws error for insufficient data", () => {
    expect(() => runBacktest({
      instrument: "NIFTY",
      condition: "Daily close falls >= 2% vs previous close",
      entry: "Buy at next day's open",
      exit: "Sell at close after 5 days",
      holdingPeriodDays: 5,
      testPeriodStart: new Date("2025-01-01"),
      testPeriodEnd: new Date("2025-01-10"),
      costAssumptions: "0.1% slippage per trade",
    }, csvPath)).toThrow("Insufficient data");
  });
});