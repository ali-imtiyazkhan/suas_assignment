# AI Usage Note

**Project:** AI Trading Research Assistant — Prototype  
**Role:** AI Full-Stack Developer Intern take-home assignment  
**Time spent:** ~3–4 hours

---

## Tools Used

| Tool | Purpose |
|------|---------|
| **Claude 3.5 Sonnet** (via Cursor/Claude.ai) | Primary coding assistant — architecture, implementation, debugging |
| **GitHub Copilot** | Inline completions, boilerplate, test scaffolding |
| **ChatGPT 4o** | Quick sanity checks, regex patterns, Prisma syntax reference |

---

## How AI Was Used

### 1. Project Scaffolding & Architecture (30%)
- Generated initial Turborepo monorepo structure with `apps/web` (Next.js) and `apps/api` (Express)
- Designed Prisma schema from requirements (Question, Experiment, Clarification, TestResult models with enums)
- Planned API route contracts matching the 5-stage flow

### 2. Backend Implementation (40%)
- **`parseQuestion.ts`**: Prompt engineering for LLM to extract structured experiment + flag missing fields
- **`runBacktest.ts`**: CSV parsing (PapaParse), vectorized stats computation (sample size, avg return, baseline, hit rate)
- **`generateSummary.ts`**: Prompt engineering for two-output LLM call (factual summary + interpretive conclusion)
- **Express routes**: REST endpoints with Zod validation, Prisma transactions for atomic updates
- **Prisma client setup** and migration commands

### 3. Frontend Implementation (20%)
- **App Router pages**: `/` (Ask), `/experiment/[id]` (Clarify/Define/Test/Learn unified)
- **Components**: AskForm, ClarifyList, ExperimentCard, ResultView with two-panel layout
- **API client** (`lib/api.ts`): typed fetch wrappers with error handling
- **State management**: React hooks for multi-step flow, optimistic updates on clarification

### 4. Documentation & Polish (10%)
- This README.md (replaced generic Turborepo template)
- PROJECT_CONTEXT.md already provided — used as spec reference
- Inline code comments for complex logic (backtest stats, LLM prompts)

---

## What AI Did NOT Do

- **No business logic decisions** — e.g., "sharp fall" threshold defaults, cost assumptions, baseline computation method
- **No product/UX decisions** — two-box result layout, clarification flow, experiment card design
- **No risk analysis** — look-ahead bias, survivorship bias, overfitting warnings are my own
- **No manual testing** — all API routes, CSV parsing, and UI flows verified by running locally

---

## Prompting Patterns That Worked Well

1. **Spec-driven development**: Paste Prisma schema + API contract → ask for implementation
2. **Iterative refinement**: "Make the backtest handle missing CSV columns gracefully" → "Add Zod validation to this route"
3. **Type-first**: Share TypeScript interfaces → get matching Zod schemas + Prisma models
4. **Context isolation**: New chat per file/service to avoid hallucinated cross-file dependencies

---

## Time Saved vs. Manual

| Task | Manual Estimate | With AI | Notes |
|------|----------------|---------|-------|
| Monorepo + Prisma setup | 45 min | 10 min | Turbo template + schema gen |
| Backtest stats engine | 90 min | 25 min | Vectorized math, edge cases |
| LLM prompt engineering | 60 min | 20 min | Iterated on output format |
| Full CRUD API routes | 60 min | 15 min | Boilerplate + validation |
| Frontend 4-screen flow | 120 min | 45 min | Component composition |
| **Total** | **~6.5 hrs** | **~1.75 hrs** | **~73% reduction** |

---

## Verification Steps Performed

- `bun dev` — both apps start, hot reload works
- `POST /questions` → returns experiment with clarifications
- `PATCH /clarifications` — updates fields, flips status to READY
- `POST /test` — runs backtest, writes TestResult, returns summary + conclusion
- `GET /result` — returns separated `summaryText` / `conclusionText`
- Frontend renders all 5 stages end-to-end with dummy question

---

## Declaration

This prototype was built with significant AI assistance for implementation speed. All architectural decisions, product choices, risk analysis, and final code review were done by me. The code reflects my understanding of the problem and ownership of the solution.