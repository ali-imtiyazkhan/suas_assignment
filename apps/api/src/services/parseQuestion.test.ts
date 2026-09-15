import { describe, it, expect } from "vitest";
import { parseQuestion, fallbackParse } from "./parseQuestion";

describe("parseQuestion", () => {
  describe("fallbackParse", () => {
    it("parses basic NIFTY sharp fall question", () => {
      const result = fallbackParse("Does buying NIFTY after a sharp fall work?");
      
      expect(result.instrument).toBe("NIFTY");
      expect(result.condition).toBe("Daily close falls >= 2% vs previous close");
      expect(result.entry).toBe("Buy at next day's open");
      expect(result.holdingPeriodDays).toBe(5);
      expect(result.hypothesis).toContain("positive average returns");
    });

    it("extracts explicit fall percentage", () => {
      const result = fallbackParse("Does buying NIFTY after a 3% fall work?");
      
      expect(result.condition).toBe("Daily close falls >= 3% vs previous close");
    });

    it("extracts explicit holding period", () => {
      const result = fallbackParse("Does buying NIFTY after a sharp fall work over 10 days?");
      
      expect(result.holdingPeriodDays).toBe(10);
    });

    it("detects BankNIFTY", () => {
      const result = fallbackParse("What about BankNIFTY after a 2% drop?");
      
      expect(result.instrument).toBe("BANKNIFTY");
    });

    it("includes assumptions for missing fields", () => {
      const result = fallbackParse("Does buying NIFTY after a sharp fall work?");
      
      expect(result.missingFields).toContain("holdingPeriodDays");
      expect(result.missingFields).toContain("testPeriodStart");
      expect(result.missingFields).toContain("testPeriodEnd");
      expect(result.missingFields).toContain("exit");
      expect(result.missingFields).toContain("costAssumptions");
      
      expect(result.assumptions.length).toBeGreaterThan(0);
      const holdingAssumption = result.assumptions.find(a => a.field === "holdingPeriodDays");
      expect(holdingAssumption).toBeDefined();
      expect(holdingAssumption?.value).toBe("5");
    });

    it("sets test period to last 3 years by default", () => {
      const result = fallbackParse("Does buying NIFTY after a sharp fall work?");
      
      const start = new Date(result.testPeriodStart!);
      const end = new Date(result.testPeriodEnd!);
      const now = new Date();
      
      expect(start.getFullYear()).toBe(now.getFullYear() - 3);
      expect(end.getFullYear()).toBe(now.getFullYear());
    });
  });
});