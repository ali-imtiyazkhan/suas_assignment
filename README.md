# AI Trading Research Assistant

A prototype that turns vague natural-language trading questions into structured, testable experiments with historical backtesting and plain-English explanations.

## Live Demo

**Frontend:** https://suas_assignmet.vercel.app 
**Backend API:** Deployed separately (e.g., Railway, Render, Fly.io)

---

## Project Overview

**Problem:** Users ask vague trading questions like *"Does buying NIFTY after a sharp fall work?"* — missing definitions for "sharp fall," holding period, test window, etc.

**Solution:** A 5-stage workflow:
1. **ASK** — User types a natural-language question
2. **CLARIFY** — System extracts knowns, asks for missing fields (or shows defaults to confirm)
3. **DEFINE** — Renders a clean "experiment recipe card" with all parameters
4. **TEST** — Runs backtest against historical NIFTY daily CSV data
5. **LEARN** — Presents results in two separate boxes:
   - *What the data shows* (factual stats)
   - *What we conclude* (interpretation + next steps)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Express.js, TypeScript |
| **Database/ORM** | PostgreSQL + Prisma 6 |
| **Package Manager** | Bun |
| **Monorepo** | Turborepo |
| **AI/LLM** | OpenAI / Anthropic API (for parsing + summarization) |
| **Deployment** | Vercel (frontend), Railway/Render (backend + DB) |

---

## Folder Structure

```
trading-research-assistant/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx        # Ask screen
│   │   │   ├── experiment/[id]/ # Clarify + Define + Test + Learn
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AskForm.tsx
│   │   │   ├── ClarifyList.tsx
│   │   │   ├── ExperimentCard.tsx
│   │   │   └── ResultView.tsx
│   │   ├── lib/api.ts          # Fetch wrappers
│   │   └── package.json
│   │
│   └── api/                    # Express backend
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── routes/
│       │   │   ├── questions.ts
│       │   │   ├── experiments.ts
│       │   │   └── results.ts
│       │   ├── services/
│       │   │   ├── parseQuestion.ts    # LLM: question → draft experiment
│       │   │   ├── runBacktest.ts      # CSV loading + stats computation
│       │   │   └── generateSummary.ts  # LLM: stats → plain English
│       │   ├── data/nifty_daily.csv    # Historical NIFTY data
│       │   ├── prismaClient.ts
│       │   └── app.ts
│       └── package.json
├── turbo.json
└── package.json
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL database (local or cloud)
- OpenAI or Anthropic API key

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd trading-research-assistant

# Install dependencies
bun install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DATABASE_URL and LLM_API_KEY

# Initialize database
cd apps/api
bunx prisma migrate dev --name init
bunx prisma generate

# Seed historical data (optional)
# The nifty_daily.csv is already in apps/api/src/data/
```

### Development

```bash
# From root - runs both web and api
bun dev

# Or individually:
# Frontend (port 3000)
cd apps/web && bun dev

# Backend (port 3001)
cd apps/api && bun dev
```

### Environment Variables

**apps/api/.env**
```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
LLM_API_KEY="sk-..."              # OpenAI or Anthropic
LLM_PROVIDER="openai"             # or "anthropic"
PORT=3001
```

---

## API Routes

| Method | Route | Stage | Description |
|--------|-------|-------|-------------|
| `POST` | `/questions` | Ask | Save question, parse to draft experiment |
| `GET` | `/experiments/:id` | Clarify/Define | Get experiment + clarifications |
| `PATCH` | `/experiments/:id/clarifications/:field` | Clarify | User confirms/edits a field |
| `POST` | `/experiments/:id/test` | Test | Run backtest + generate summary |
| `GET` | `/experiments/:id/result` | Learn | Get test results (summary + conclusion separated) |

---

## Key Design Decisions

- **`ClarificationSource` enum** (`ASSUMED` / `USER_CONFIRMED` / `USER_PROVIDED`) — makes assumptions queryable data, not buried chat logs
- **Separate `summaryText` vs `conclusionText` columns** — enforces fact/interpretation separation at data layer
- **No shared `packages/` layer** — frontend/backend communicate via HTTP/JSON only
- **Static CSV backtesting** — no live data, no engine; demonstrates workflow not infrastructure

---

## Risks & Limitations (for Thinking Note)

- Look-ahead bias in backtesting
- Survivorship bias (NIFTY 50 composition changes)
- Small sample sizes for specific conditions
- Transaction costs/slippage not modeled
- Ambiguous definitions (e.g., "sharp fall")

---

## License

MIT — take-home assignment prototype.