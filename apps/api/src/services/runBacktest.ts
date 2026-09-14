import * as fs from "fs";
import * as path from "path";

interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestParams {
  instrument: string;
  condition: string;
  entry: string;
  exit: string;
  holdingPeriodDays: number;
  testPeriodStart: Date;
  testPeriodEnd: Date;
  costAssumptions: string;
}

interface BacktestResult {
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

function parseCondition(condition: string, prevClose: number, currentClose: number): boolean {
  const lower = condition.toLowerCase();
  
  const fallMatch = lower.match(/falls?\s*>=\s*(\d+(?:\.\d+)?)%/);
  if (fallMatch) {
    const threshold = parseFloat(fallMatch[1]) / 100;
    const change = (currentClose - prevClose) / prevClose;
    return change <= -threshold;
  }
  
  const dropMatch = lower.match(/drop[s]?\s*>=\s*(\d+(?:\.\d+)?)%/);
  if (dropMatch) {
    const threshold = parseFloat(dropMatch[1]) / 100;
    const change = (currentClose - prevClose) / prevClose;
    return change <= -threshold;
  }
  
  if (lower.includes("sharp fall") || lower.includes("big drop") || lower.includes("crash")) {
    const change = (currentClose - prevClose) / prevClose;
    return change <= -0.02;
  }
  
  const change = (currentClose - prevClose) / prevClose;
  return change <= -0.015;
}

function parseCostAssumptions(costAssumptions: string): number {
  const lower = costAssumptions.toLowerCase();
  const match = lower.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) {
    return parseFloat(match[1]) / 100;
  }
  return 0.001;
}

function loadCSVData(filePath: string): PriceData[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  
  const dateIdx = headers.findIndex(h => h.includes("date"));
  const openIdx = headers.findIndex(h => h.includes("open"));
  const highIdx = headers.findIndex(h => h.includes("high"));
  const lowIdx = headers.findIndex(h => h.includes("low"));
  const closeIdx = headers.findIndex(h => h.includes("close"));
  const volumeIdx = headers.findIndex(h => h.includes("volume"));
  
  const data: PriceData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    if (cols.length < Math.max(dateIdx, openIdx, highIdx, lowIdx, closeIdx, volumeIdx) + 1) continue;
    
    const date = new Date(cols[dateIdx]);
    if (isNaN(date.getTime())) continue;
    
    data.push({
      date,
      open: parseFloat(cols[openIdx]) || 0,
      high: parseFloat(cols[highIdx]) || 0,
      low: parseFloat(cols[lowIdx]) || 0,
      close: parseFloat(cols[closeIdx]) || 0,
      volume: parseFloat(cols[volumeIdx]) || 0,
    });
  }
  
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function runBacktest(params: BacktestParams, csvPath?: string): BacktestResult {
  const dataFile = csvPath || path.join(process.cwd(), "src", "data", "nifty_daily.csv");
  const allData = loadCSVData(dataFile);
  
  const startTime = params.testPeriodStart.getTime();
  const endTime = params.testPeriodEnd.getTime();
  
  const filteredData = allData.filter(d => d.date.getTime() >= startTime && d.date.getTime() <= endTime);
  
  if (filteredData.length < 2) {
    throw new Error("Insufficient data for the test period");
  }
  
  const costPct = parseCostAssumptions(params.costAssumptions);
  const events: BacktestResult["events"] = [];
  const returns: number[] = [];
  const baselineReturns: number[] = [];
  
  for (let i = 1; i < filteredData.length - params.holdingPeriodDays; i++) {
    const prevDay = filteredData[i - 1];
    const currentDay = filteredData[i];
    
    if (parseCondition(params.condition, prevDay.close, currentDay.close)) {
      const entryPrice = currentDay.open * (1 + costPct);
      const exitIndex = i + params.holdingPeriodDays;
      
      if (exitIndex >= filteredData.length) continue;
      
      const exitDay = filteredData[exitIndex];
      const exitPrice = exitDay.close * (1 - costPct);
      
      const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
      
      events.push({
        entryDate: currentDay.date.toISOString().split("T")[0],
        entryPrice: Number(entryPrice.toFixed(2)),
        exitDate: exitDay.date.toISOString().split("T")[0],
        exitPrice: Number(exitPrice.toFixed(2)),
        returnPct: Number(returnPct.toFixed(4)),
      });
      
      returns.push(returnPct);
    }
    
    const baselineEntryPrice = currentDay.open * (1 + costPct);
    const baselineExitIndex = i + params.holdingPeriodDays;
    if (baselineExitIndex < filteredData.length) {
      const baselineExitDay = filteredData[baselineExitIndex];
      const baselineExitPrice = baselineExitDay.close * (1 - costPct);
      const baselineReturnPct = ((baselineExitPrice - baselineEntryPrice) / baselineEntryPrice) * 100;
      baselineReturns.push(baselineReturnPct);
    }
  }
  
  const sampleSize = events.length;
  const avgReturnPct = returns.length > 0 
    ? returns.reduce((a, b) => a + b, 0) / returns.length 
    : 0;
  const baselineReturnPct = baselineReturns.length > 0
    ? baselineReturns.reduce((a, b) => a + b, 0) / baselineReturns.length
    : 0;
  const hitRatePct = returns.length > 0
    ? (returns.filter(r => r > 0).length / returns.length) * 100
    : 0;
  
  return {
    dataSource: path.basename(dataFile),
    sampleSize,
    avgReturnPct: Number(avgReturnPct.toFixed(4)),
    baselineReturnPct: Number(baselineReturnPct.toFixed(4)),
    hitRatePct: Number(hitRatePct.toFixed(2)),
    events,
  };
}