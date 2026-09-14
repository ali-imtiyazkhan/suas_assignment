const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface Experiment {
  id: string;
  questionId: string;
  instrument: string;
  condition: string;
  entry: string;
  exit: string | null;
  holdingPeriodDays: number | null;
  testPeriodStart: string | null;
  testPeriodEnd: string | null;
  costAssumptions: string | null;
  hypothesis: string;
  status: "DRAFT" | "CLARIFYING" | "READY" | "TESTED";
  createdAt: string;
  updatedAt: string;
  clarifications: Clarification[];
  question: { id: string; rawText: string; createdAt: string };
  result?: TestResult;
}

export interface Clarification {
  id: string;
  experimentId: string;
  field: string;
  promptText: string;
  source: "ASSUMED" | "USER_CONFIRMED" | "USER_PROVIDED";
  value: string;
  createdAt: string;
}

export interface TestResult {
  id: string;
  experimentId: string;
  dataSource: string;
  sampleSize: number;
  avgReturnPct: number;
  baselineReturnPct: number;
  hitRatePct: number | null;
  summaryText: string;
  conclusionText: string;
  nextSteps: string | null;
  createdAt: string;
  experiment?: Experiment;
}

export interface ParsedExperiment {
  instrument: string;
  condition: string;
  entry: string;
  exit?: string;
  holdingPeriodDays?: number;
  testPeriodStart?: string;
  testPeriodEnd?: string;
  costAssumptions?: string;
  hypothesis: string;
  missingFields: string[];
  assumptions: Array<{ field: string; value: string; reasoning: string }>;
}

export interface BacktestResult {
  dataSource: string;
  sampleSize: number;
  avgReturnPct: number;
  baselineReturnPct: number;
  hitRatePct: number;
  events: Array<{
    entryDate: string;
    entryPrice: number;
    exitDate: string;
    exitPrice: number;
    returnPct: number;
  }>;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }

  return data as T;
}

export async function submitQuestion(rawText: string): Promise<{ experiment: Experiment }> {
  return fetchJson("/questions", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export async function getExperiment(id: string): Promise<{ experiment: Experiment }> {
  return fetchJson(`/experiments/${id}`);
}

export async function updateClarification(
  experimentId: string,
  field: string,
  value: string,
  source: "USER_CONFIRMED" | "USER_PROVIDED" = "USER_PROVIDED"
): Promise<{ clarification: Clarification; status: string }> {
  return fetchJson(`/experiments/${experimentId}/clarifications/${field}`, {
    method: "PATCH",
    body: JSON.stringify({ value, source }),
  });
}

export async function runTest(experimentId: string): Promise<{ result: TestResult }> {
  return fetchJson(`/results/${experimentId}/test`, {
    method: "POST",
  });
}

export async function getResult(experimentId: string): Promise<{ result: TestResult }> {
  return fetchJson(`/results/${experimentId}/result`);
}