import { Router } from "express";
import { prisma } from "../prismaClient";
import { runBacktest } from "../services/runBacktest";
import { generateSummary } from "../services/generateSummary";

const router = Router();

router.post("/:id/test", async (req, res) => {
  const { id } = req.params;
  
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: { result: true },
    });
    
    if (!experiment) {
      return res.status(404).json({ message: "Experiment not found" });
    }
    
    if (experiment.status !== "READY") {
      return res.status(400).json({ message: "Experiment not ready for testing" });
    }
    
    if (experiment.result) {
      return res.status(400).json({ message: "Experiment already tested" });
    }
    
    const backtestResult = runBacktest({
      instrument: experiment.instrument,
      condition: experiment.condition,
      entry: experiment.entry,
      exit: experiment.exit || `Sell at close after ${experiment.holdingPeriodDays} days`,
      holdingPeriodDays: experiment.holdingPeriodDays!,
      testPeriodStart: experiment.testPeriodStart!,
      testPeriodEnd: experiment.testPeriodEnd!,
      costAssumptions: experiment.costAssumptions || "0.1% slippage per trade",
    });
    
    const summary = await generateSummary(
      {
        instrument: experiment.instrument,
        condition: experiment.condition,
        entry: experiment.entry,
        exit: experiment.exit || `Sell at close after ${experiment.holdingPeriodDays} days`,
        holdingPeriodDays: experiment.holdingPeriodDays!,
        testPeriodStart: experiment.testPeriodStart!,
        testPeriodEnd: experiment.testPeriodEnd!,
        costAssumptions: experiment.costAssumptions || "0.1% slippage per trade",
        hypothesis: experiment.hypothesis,
      },
      {
        sampleSize: backtestResult.sampleSize,
        avgReturnPct: backtestResult.avgReturnPct,
        baselineReturnPct: backtestResult.baselineReturnPct,
        hitRatePct: backtestResult.hitRatePct,
      }
    );
    
    const result = await prisma.testResult.create({
      data: {
        experimentId: id,
        dataSource: backtestResult.dataSource,
        sampleSize: backtestResult.sampleSize,
        avgReturnPct: backtestResult.avgReturnPct,
        baselineReturnPct: backtestResult.baselineReturnPct,
        hitRatePct: backtestResult.hitRatePct,
        summaryText: summary.summaryText,
        conclusionText: summary.conclusionText,
        nextSteps: summary.nextSteps,
      },
    });
    
    await prisma.experiment.update({
      where: { id },
      data: { status: "TESTED" },
    });
    
    return res.status(201).json({ result });
  } catch (error) {
    console.error("Error running backtest:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id/result", async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await prisma.testResult.findUnique({
      where: { experimentId: id },
      include: {
        experiment: {
          include: { question: true },
        },
      },
    });
    
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }
    
    return res.json({ result });
  } catch (error) {
    console.error("Error fetching result:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;