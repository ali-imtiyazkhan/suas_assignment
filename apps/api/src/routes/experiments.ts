import { Router } from "express";
import { prisma } from "../prismaClient";
import { parseQuestion } from "../services/parseQuestion";

const router = Router();

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        clarifications: true,
        question: true,
      },
    });
    
    if (!experiment) {
      return res.status(404).json({ message: "Experiment not found" });
    }
    
    return res.json({ experiment });
  } catch (error) {
    console.error("Error fetching experiment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/clarifications/:field", async (req, res) => {
  const { id, field } = req.params;
  const { value, source } = req.body;
  
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: { clarifications: true },
    });
    
    if (!experiment) {
      return res.status(404).json({ message: "Experiment not found" });
    }
    
    const clarification = await prisma.clarification.upsert({
      where: {
        experimentId_field: {
          experimentId: id,
          field,
        },
      },
      update: {
        value,
        source: source || "USER_PROVIDED",
      },
      create: {
        experimentId: id,
        field,
        promptText: `Please confirm ${field}`,
        value,
        source: source || "USER_PROVIDED",
      },
    });
    
    const updateData: Record<string, unknown> = {};
    const numericFields = ["holdingPeriodDays"];
    const dateFields = ["testPeriodStart", "testPeriodEnd"];
    
    if (numericFields.includes(field)) {
      updateData[field] = parseInt(value, 10);
    } else if (dateFields.includes(field)) {
      updateData[field] = new Date(value);
    } else {
      updateData[field] = value;
    }
    
    await prisma.experiment.update({
      where: { id },
      data: updateData,
    });
    
    const allRequiredFields = [
      "instrument",
      "condition",
      "entry",
      "holdingPeriodDays",
      "testPeriodStart",
      "testPeriodEnd",
    ];
    
    const resolvedFields = experiment.clarifications
      .filter(c => c.source !== "ASSUMED")
      .map(c => c.field);
    
    const allResolved = allRequiredFields.every(f => resolvedFields.includes(f));
    
    if (allResolved && experiment.status !== "READY") {
      await prisma.experiment.update({
        where: { id },
        data: { status: "READY" },
      });
    }
    
    return res.json({ clarification, status: allResolved ? "READY" : experiment.status });
  } catch (error) {
    console.error("Error updating clarification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const { questionId, rawText } = req.body;
  
  let experiment;
  
  if (questionId) {
    experiment = await prisma.experiment.findUnique({
      where: { questionId },
      include: { clarifications: true, question: true },
    });
  } else if (rawText) {
    const question = await prisma.question.create({
      data: { rawText },
    });
    
    const parsed = await parseQuestion(rawText);
    
    experiment = await prisma.experiment.create({
      data: {
        questionId: question.id,
        instrument: parsed.instrument,
        condition: parsed.condition,
        entry: parsed.entry,
        exit: parsed.exit,
        holdingPeriodDays: parsed.holdingPeriodDays,
        testPeriodStart: parsed.testPeriodStart ? new Date(parsed.testPeriodStart) : null,
        testPeriodEnd: parsed.testPeriodEnd ? new Date(parsed.testPeriodEnd) : null,
        costAssumptions: parsed.costAssumptions,
        hypothesis: parsed.hypothesis,
        status: parsed.missingFields.length > 0 ? "CLARIFYING" : "READY",
        clarifications: {
          create: parsed.assumptions.map(a => ({
            field: a.field,
            promptText: `Assumed ${a.field}: ${a.value} (${a.reasoning})`,
            value: a.value,
            source: "ASSUMED",
          })),
        },
      },
      include: { clarifications: true, question: true },
    });
  } else {
    return res.status(400).json({ message: "Either questionId or rawText required" });
  }
  
  return res.status(201).json({ experiment });
});

export default router;