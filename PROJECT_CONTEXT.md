# Project: AI Trading Research Assistant — Prototype

## Context

This is a take-home assignment for an AI Full-Stack Developer Intern application
("Option 2: Thinking & Building Challenge"). Estimated effort 3–4 hours, 3-day
deadline. Evaluation is weighted heavily toward reasoning, not code volume:

| Area | Weight |
|---|---|
| Critical Thinking | 25% |
| Original / Independent Thinking | 20% |
| Problem Solving | 20% |
| Product Thinking | 15% |
| Technical Implementation | 15% |
| Communication | 5% |

Required deliverables: working prototype, GitHub repo, a Thinking Note (max 2
pages), a README, an AI Usage Note (max 1 page), and a 2–3 min demo video.

## The problem, in plain terms

A user types a vague natural-language trading question, e.g.:

> "Does buying NIFTY after a sharp fall work?"

NIFTY is a single number representing the average performance of the top 50
Indian companies' stock prices — think of it as a daily scoreboard for the
Indian stock market.

The question is deliberately incomplete (no defined "sharp fall" threshold, no
holding period, no test window). The system must turn this vague question into
a precise, testable "experiment," run it against historical data, and explain
the result in plain English — while clearly separating **what the data shows**
from **what the system concludes** from it.

## The 5-stage user flow

1. **ASK** — user types their question in a text box.
2. **CLARIFY** — system extracts what it can (instrument, condition) and either
   asks the user for missing fields (holding period, test window) or shows a
   reasonable default assumption for the user to confirm/edit. Nothing important
   is silently invented.
3. **DEFINE** — once resolved, render the final structured "experiment" as a
   clean recipe card (instrument, condition, entry, exit, holding period, test
   period, cost assumptions, hypothesis).
4. **TEST** — run the rule against historical NIFTY daily price data (a static
   CSV is fine — no live feed, no real backtesting engine required). Compute
   simple stats: sample size, average return after the holding period vs. a
   random-day baseline, hit rate.
5. **LEARN** — present results in plain English, in two visibly separate boxes:
   - *What the data shows* (factual, e.g. "47 matching events, average 5-day
     return +0.6% vs. +0.1% baseline")
   - *What we conclude* (interpretive, e.g. "small edge, but sample is limited
     and costs aren't included — treat as a lead, not a proven strategy")
   Include a "what to investigate next" suggestion.

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript
- **Backend:** Express (Node.js), TypeScript
- **Database/ORM:** PostgreSQL + Prisma 6
- **Package manager / runtime:** Bun
- **Monorepo tool:** Turborepo — kept intentionally simple, only two apps, no
  shared `packages/` layer (frontend and backend only talk over HTTP/JSON, so
  no shared types package is needed)
- **AI:** an LLM API (e.g. Claude or OpenAI) used for two jobs: (1) parsing the
  raw question into a draft experiment + flagging missing fields, (2) turning
  the computed stats into plain-English summary/conclusion text

## Folder structure

```
trading-research-assistant/
├── apps/
│   ├── web/                       # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx           # Ask screen
│   │   │   ├── experiment/[id]/
│   │   │   │   └── page.tsx       # Clarify + Define + Test + Learn screens
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AskForm.tsx
│   │   │   ├── ClarifyList.tsx
│   │   │   ├── ExperimentCard.tsx
│   │   │   └── ResultView.tsx
│   │   ├── lib/
│   │   │   └── api.ts             # fetch wrappers calling apps/api
│   │   └── package.json
│   │
│   └── api/                       # Express backend
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── routes/
│       │   │   ├── questions.ts
│       │   │   ├── experiments.ts
│       │   │   └── results.ts
│       │   ├── services/
│       │   │   ├── parseQuestion.ts   # LLM call: question -> draft experiment
│       │   │   ├── runBacktest.ts     # loads CSV, computes stats
│       │   │   └── generateSummary.ts # LLM call: stats -> plain-English text
│       │   ├── data/
│       │   │   └── nifty_daily.csv
│       │   ├── prismaClient.ts
│       │   └── app.ts
│       └── package.json
│
├── turbo.json
└── package.json
```

## Prisma schema (apps/api/prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Question {
  id         String      @id @default(cuid())
  rawText    String
  createdAt  DateTime    @default(now())
  experiment Experiment?
}

model Experiment {
  id                String             @id @default(cuid())
  questionId        String             @unique
  question          Question           @relation(fields: [questionId], references: [id])

  instrument        String
  condition         String
  entry             String
  exit              String?
  holdingPeriodDays Int?
  testPeriodStart   DateTime?
  testPeriodEnd     DateTime?
  costAssumptions   String?
  hypothesis        String

  status            ExperimentStatus   @default(DRAFT)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  clarifications    Clarification[]
  result            TestResult?
}

enum ExperimentStatus {
  DRAFT
  CLARIFYING
  READY
  TESTED
}

model Clarification {
  id           String               @id @default(cuid())
  experimentId String
  experiment   Experiment           @relation(fields: [experimentId], references: [id])

  field        String
  promptText   String
  source       ClarificationSource
  value        String
  createdAt    DateTime             @default(now())
}

enum ClarificationSource {
  ASSUMED
  USER_CONFIRMED
  USER_PROVIDED
}

model TestResult {
  id                String     @id @default(cuid())
  experimentId      String     @unique
  experiment        Experiment @relation(fields: [experimentId], references: [id])

  dataSource        String
  sampleSize        Int
  avgReturnPct      Float
  baselineReturnPct Float
  hitRatePct        Float?

  summaryText       String     // factual: "What the data shows"
  conclusionText    String     // interpretive: "What we conclude"
  nextSteps         String?

  createdAt         DateTime   @default(now())
}
```

## API routes

| Method & Route | Stage | Purpose |
|---|---|---|
| `POST /questions` | Ask | Save raw question, call `parseQuestion`, create `DRAFT`/`CLARIFYING` `Experiment` + `Clarification` rows |
| `GET /experiments/:id` | Clarify/Define | Return current experiment + clarifications |
| `PATCH /experiments/:id/clarifications/:field` | Clarify | User answers/confirms a field; flips status to `READY` once all required fields resolved |
| `POST /experiments/:id/test` | Test | Only when `status = READY`; runs `runBacktest` + `generateSummary`, writes `TestResult`, flips status to `TESTED` |
| `GET /experiments/:id/result` | Learn | Return `TestResult` with `summaryText`/`conclusionText` kept separate |

## Key design decisions (for the Thinking Note / README)

- **`ClarificationSource` enum** (`ASSUMED` / `USER_CONFIRMED` / `USER_PROVIDED`)
  makes "what the user said vs. what we assumed" queryable data, not just a
  buried chat log — directly addresses the brief's requirement to keep
  assumptions visible rather than silently invented.
- **`summaryText` vs. `conclusionText`** are separate columns, not one blob —
  enforces the brief's requirement to distinguish fact from interpretation at
  the data layer, not just in UI copy.
- **No shared `packages/` layer** — frontend and backend communicate purely
  over HTTP/JSON, kept deliberately simple for a 3-hour build; Prisma schema
  lives inside `apps/api` only.
- **No live market data / no real backtesting engine** — a static historical
  CSV is sufficient; the point is demonstrating the research workflow, not
  building production infrastructure.
- **Risks to flag explicitly** (from the Thinking Note): look-ahead bias,
  survivorship bias, overfitting on a small sample, ignoring transaction
  costs/slippage, ambiguous definition of "sharp fall."

## Runtime notes

- Package manager: **Bun** (`bun add`, `bunx prisma ...`)
- Prisma version: **6**
- Setup: `bunx prisma init` → paste schema → set `DATABASE_URL` → `bunx prisma migrate dev --name init`
