import { z } from "zod";

const ParsedExperimentSchema = z.object({
  instrument: z.string(),
  condition: z.string(),
  entry: z.string(),
  exit: z.string().optional(),
  holdingPeriodDays: z.number().int().positive().optional(),
  testPeriodStart: z.string().datetime().optional(),
  testPeriodEnd: z.string().datetime().optional(),
  costAssumptions: z.string().optional(),
  hypothesis: z.string(),
  missingFields: z.array(z.string()),
  assumptions: z.array(z.object({
    field: z.string(),
    value: z.string(),
    reasoning: z.string(),
  })),
});

type ParsedExperiment = z.infer<typeof ParsedExperimentSchema>;

const SYSTEM_PROMPT = `You are a trading research assistant. Parse the user's natural language trading question into a structured experiment.

Return a JSON object with these fields:
- instrument: The trading instrument (e.g., "NIFTY", "BANKNIFTY")
- condition: The entry condition in plain English (e.g., "Daily close falls >= 1.5% vs previous close")
- entry: How to enter the trade (e.g., "Buy at next day's open")
- exit: How to exit the trade (optional, e.g., "Sell at close, N days later")
- holdingPeriodDays: Number of days to hold (optional, integer)
- testPeriodStart: Start date for backtest in ISO format (optional)
- testPeriodEnd: End date for backtest in ISO format (optional)
- costAssumptions: Transaction cost assumptions (optional, e.g., "0.1% slippage + brokerage per trade")
- hypothesis: What the user believes (e.g., "Buying after sharp falls produces positive returns")
- missingFields: Array of field names that are required but not specified in the question
- assumptions: Array of {field, value, reasoning} for fields you're assuming with defaults

Required fields for a testable experiment: instrument, condition, entry, holdingPeriodDays, testPeriodStart, testPeriodEnd.

If the user doesn't specify holding period, assume 5 days with reasoning "Common short-term holding period".
If the user doesn't specify test period, assume last 3 years with reasoning "Recent 3-year window for relevance".
If the user doesn't specify exit, assume "Sell at close after holding period days" with reasoning "Standard fixed-holding exit".
If the user doesn't specify cost assumptions, assume "0.1% slippage per trade" with reasoning "Typical retail brokerage cost".

Return ONLY valid JSON. No markdown, no explanation.`;

export async function parseQuestion(rawText: string): Promise<ParsedExperiment> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackParse(rawText);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: rawText }],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(content);
    return ParsedExperimentSchema.parse(parsed);
  } catch (error) {
    console.warn("LLM parsing failed, using fallback:", error);
    return fallbackParse(rawText);
  }
}

function fallbackParse(rawText: string): ParsedExperiment {
  const text = rawText.toLowerCase();

  let instrument = "NIFTY";
  if (text.includes("banknifty") || text.includes("bank nifty")) {
    instrument = "BANKNIFTY";
  } else if (text.includes("nifty")) {
    instrument = "NIFTY";
  }

  let condition = "Daily close falls >= 1.5% vs previous close";
  const fallMatch = text.match(/fall[s]?\s*(?:of|by|>|>=)?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (fallMatch) {
    condition = `Daily close falls >= ${fallMatch[1]}% vs previous close`;
  } else if (text.includes("sharp fall") || text.includes("big drop") || text.includes("crash")) {
    condition = "Daily close falls >= 2% vs previous close";
  }

  const holdingMatch = text.match(/(\d+)\s*day/i);
  const holdingPeriodDays = holdingMatch ? parseInt(holdingMatch[1] ?? "") : 5;

  const currentYear = new Date().getFullYear();
  const testPeriodStart = `${currentYear - 3}-01-01T00:00:00.000Z`;
  const testPeriodEnd = `${currentYear}-12-31T23:59:59.999Z`;

  const missingFields: string[] = [];
  const assumptions: ParsedExperiment["assumptions"] = [];

  if (!holdingMatch) {
    missingFields.push("holdingPeriodDays");
    assumptions.push({
      field: "holdingPeriodDays",
      value: "5",
      reasoning: "Common short-term holding period",
    });
  }

  if (!text.includes("202") && !text.includes("year") && !text.includes("period")) {
    missingFields.push("testPeriodStart", "testPeriodEnd");
    assumptions.push({
      field: "testPeriodStart",
      value: testPeriodStart,
      reasoning: "Recent 3-year window for relevance",
    });
    assumptions.push({
      field: "testPeriodEnd",
      value: testPeriodEnd,
      reasoning: "Recent 3-year window for relevance",
    });
  }

  if (!text.includes("exit") && !text.includes("sell")) {
    missingFields.push("exit");
    assumptions.push({
      field: "exit",
      value: `Sell at close after ${holdingPeriodDays} days`,
      reasoning: "Standard fixed-holding exit",
    });
  }

  if (!text.includes("cost") && !text.includes("slippage") && !text.includes("brokerage")) {
    missingFields.push("costAssumptions");
    assumptions.push({
      field: "costAssumptions",
      value: "0.1% slippage per trade",
      reasoning: "Typical retail brokerage cost",
    });
  }

  return {
    instrument,
    condition,
    entry: "Buy at next day's open",
    exit: `Sell at close after ${holdingPeriodDays} days`,
    holdingPeriodDays,
    testPeriodStart,
    testPeriodEnd,
    costAssumptions: "0.1% slippage per trade",
    hypothesis: "Buying after sharp falls produces positive average returns over the holding period",
    missingFields,
    assumptions,
  };
}