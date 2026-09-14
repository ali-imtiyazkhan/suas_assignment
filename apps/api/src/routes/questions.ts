import { Router } from "express";
import { prisma } from "../prismaClient";
import { parseQuestion } from "../services/parseQuestion";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { rawText } = req.body as { rawText?: string };

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "rawText is required" });
    }

    const question = await prisma.question.create({
      data: { rawText: rawText.trim() },
    });

    const parsed = await parseQuestion(rawText);

    const experiment = await prisma.experiment.create({
      data: {
        questionId: question.id,
        instrument: parsed.instrument,
        condition: parsed.condition,
        entry: parsed.entry,
        exit: parsed.exit ?? null,
        holdingPeriodDays: parsed.holdingPeriodDays ?? null,
        testPeriodStart: parsed.testPeriodStart ? new Date(parsed.testPeriodStart) : null,
        testPeriodEnd: parsed.testPeriodEnd ? new Date(parsed.testPeriodEnd) : null,
        costAssumptions: parsed.costAssumptions ?? null,
        hypothesis: parsed.hypothesis,
        status: parsed.missingFields.length > 0 ? "CLARIFYING" : "READY",
        clarifications: {
          create: parsed.assumptions.map(a => ({
            field: a.field,
            promptText: `Assumed ${a.field}: ${a.value} (${a.reasoning})`,
            source: "ASSUMED",
            value: a.value,
          })),
        },
      },
      include: { clarifications: true },
    });

    return res.status(201).json({ experiment });
  } catch (err) {
    console.error("POST /questions failed:", err);
    return res.status(500).json({ error: "Failed to process question" });
  }
});

export default router;