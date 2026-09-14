-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'CLARIFYING', 'READY', 'TESTED');

-- CreateEnum
CREATE TYPE "ClarificationSource" AS ENUM ('ASSUMED', 'USER_CONFIRMED', 'USER_PROVIDED');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "entry" TEXT NOT NULL,
    "exit" TEXT,
    "holdingPeriodDays" INTEGER,
    "testPeriodStart" TIMESTAMP(3),
    "testPeriodEnd" TIMESTAMP(3),
    "costAssumptions" TEXT,
    "hypothesis" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clarification" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "source" "ClarificationSource" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "avgReturnPct" DOUBLE PRECISION NOT NULL,
    "baselineReturnPct" DOUBLE PRECISION NOT NULL,
    "hitRatePct" DOUBLE PRECISION,
    "summaryText" TEXT NOT NULL,
    "conclusionText" TEXT NOT NULL,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_questionId_key" ON "Experiment"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_experimentId_key" ON "TestResult"("experimentId");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clarification" ADD CONSTRAINT "Clarification_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
