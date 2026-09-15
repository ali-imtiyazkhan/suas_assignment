import { z } from "zod";

const SummarySchema = z.object({
  summaryText: z.string(),
  conclusionText: z.string(),
  nextSteps: z.string().optional(),
});

type Summary = z.infer<typeof SummarySchema>;

const SYSTEM_PROMPT = `You are a trading research assistant. Generate a plain-English summary and conclusion from backtest results.

You will receive:
- The original experiment parameters (instrument, condition, holding period, etc.)
- Backtest statistics: sample size, average return, baseline return, hit rate

Return a JSON object with:
- summaryText: FACTUAL "What the data shows" - only state facts from the data, no interpretation. Example: "47 matching events found over 2021-2024. Average 5-day return after signal: +0.62%. Random-day baseline 5-day return: +0.11%. Hit rate: 53%."
- conclusionText: INTERPRETIVE "What we conclude" - your assessment with caveats. Example: "Small positive edge vs baseline, but sample is limited (47 events). Costs not fully modeled. Treat as a lead for further research, not a proven strategy."
- nextSteps: Optional suggestion for follow-up investigation. Example: "Test different fall thresholds (1%, 2%, 3%). Test longer holding periods (10, 20 days). Add transaction cost sensitivity analysis."

Rules:
- Keep summaryText purely factual - no "suggests", "indicates", "may", "likely"
- Keep conclusionText separate - this is where interpretation lives
- Be honest about limitations (sample size, costs, look-ahead bias, etc.)
- No markdown, no explanation, only valid JSON`;

export async function generateSummary(
  experiment: {
    instrument: string;
    condition: string;
    entry: string;
    exit: string;
    holdingPeriodDays: number;
    testPeriodStart: Date;
    testPeriodEnd: Date;
    costAssumptions: string;
    hypothesis: string;
  },
  result: {
    sampleSize: number;
    avgReturnPct: number;
    baselineReturnPct: number;
    hitRatePct: number;
  }
): Promise<Summary> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return fallbackGenerate(experiment, result);
  }

  try {
    const userPrompt = `Experiment:
- Instrument: ${experiment.instrument}
- Condition: ${experiment.condition}
- Entry: ${experiment.entry}
- Exit: ${experiment.exit}
- Holding Period: ${experiment.holdingPeriodDays} days
- Test Period: ${experiment.testPeriodStart.toISOString().split("T")[0]} to ${experiment.testPeriodEnd.toISOString().split("T")[0]}
- Cost Assumptions: ${experiment.costAssumptions}
- Hypothesis: ${experiment.hypothesis}

Results:
- Sample Size: ${result.sampleSize}
- Average Return: ${result.avgReturnPct.toFixed(2)}%
- Baseline Return: ${result.baselineReturnPct.toFixed(2)}%
- Hit Rate: ${result.hitRatePct.toFixed(1)}%`;

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
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(content);
    return SummarySchema.parse(parsed);
  } catch (error) {
    console.warn("LLM summary generation failed, using fallback:", error);
    return fallbackGenerate(experiment, result);
  }
}

export function fallbackGenerate(
  experiment: {
    instrument: string;
    condition: string;
    holdingPeriodDays: number;
    testPeriodStart: Date;
    testPeriodEnd: Date;
  },
  result: {
    sampleSize: number;
    avgReturnPct: number;
    baselineReturnPct: number;
    hitRatePct: number;
  }
): Summary {
  const startStr = experiment.testPeriodStart.toISOString().split("T")[0];
  const endStr = experiment.testPeriodEnd.toISOString().split("T")[0];
  
  const summaryText = `${result.sampleSize} matching events found over ${startStr} to ${endStr}. Average ${experiment.holdingPeriodDays}-day return after signal: ${result.avgReturnPct >= 0 ? "+" : ""}${result.avgReturnPct.toFixed(2)}%. Random-day baseline ${experiment.holdingPeriodDays}-day return: ${result.baselineReturnPct >= 0 ? "+" : ""}${result.baselineReturnPct.toFixed(2)}%. Hit rate: ${result.hitRatePct.toFixed(1)}%.`;

  const edge = result.avgReturnPct - result.baselineReturnPct;
  let conclusionText = "";
  
  if (result.sampleSize < 30) {
    conclusionText = `Very small sample (${result.sampleSize} events) — results are not statistically reliable. `;
  } else if (result.sampleSize < 100) {
    conclusionText = `Limited sample (${result.sampleSize} events) — treat results as indicative only. `;
  } else {
    conclusionText = `Adequate sample size (${result.sampleSize} events). `;
  }
  
  if (edge > 0.5) {
    conclusionText += `Meaningful positive edge vs baseline (${edge.toFixed(2)}% excess return). `;
  } else if (edge > 0) {
    conclusionText += `Small positive edge vs baseline (${edge.toFixed(2)}% excess return). `;
  } else if (edge > -0.5) {
    conclusionText += `No meaningful edge vs baseline (${edge.toFixed(2)}% excess return). `;
  } else {
    conclusionText += `Negative edge vs baseline (${edge.toFixed(2)}% excess return). `;
  }
  
  conclusionText += "Costs and slippage may reduce real-world returns. Look-ahead bias possible if condition uses same-day data. Treat as a research lead, not a proven strategy.";
  
  const nextSteps = "Test different fall thresholds (1%, 2%, 3%). Test longer holding periods (10, 20 days). Add transaction cost sensitivity analysis. Validate on out-of-sample data.";

  return { summaryText, conclusionText, nextSteps };
}