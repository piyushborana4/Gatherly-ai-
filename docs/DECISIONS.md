# Gatherly AI — Architectural & Engineering Decisions

This document records the key architectural decisions made in **Gatherly AI**, why each trade-off was chosen, and how every claim is verified in the codebase.

---

## ADR-01: Modular Server-Only Gemini Execution with Verified Firebase ID Tokens
- **Context**: Calling `@google/genai` from browser code exposes the `GEMINI_API_KEY` in network inspection and client bundles. Furthermore, unauthenticated AI endpoints are vulnerable to quota exhaustion, and a monolithic server file hinders unit/integration testing.
- **Decision**:
  1. Split the Express server into focused modules under `src/server/`: `src/server/app.ts` (`createApp`), `src/server/middleware.ts` (`createAuthMiddleware`, `requireFirebaseAuth`, `getDefaultTokenVerifier`, `createRateLimiter`, `logStructuredError`), `src/server/gemini.ts` (`PLAN_RESPONSE_SCHEMA`, `COPILOT_TOOLS`, `withRetry` with `AbortSignal.timeout` and `GEMINI_TIMEOUT_MS = 25_000`, `ResearchLruCache`), and `src/server/routes.ts` (`registerApiRoutes`).
  2. Require `Authorization: Bearer <token>` on all `/api/ai/*` routes and verify tokens via `firebase-admin/auth` (`verifyIdToken`).
  3. Default the model identifier to `gemini-3.8-flash` (`GEMINI_MODEL`) and make it configurable via `process.env.GEMINI_MODEL`.
- **Verification**: `src/server/app.ts`, `src/server/middleware.ts`, `src/server/gemini.ts`, `src/server/routes.ts`, `src/services/aiService.ts`, and 8 Supertest integration tests in `tests/api.test.ts`.

---

## ADR-02: Deterministic Currency & Calendar Math Over Raw LLM Arithmetic
- **Context**: Large language models can produce off-by-one rounding discrepancies when summing budget category allocations or hallucinate invalid calendar dates (such as February 30).
- **Decision**:
  1. Gemini outputs `percentageOfTotal` (`0–100`) for budget categories (`PLAN_RESPONSE_SCHEMA`) and integer `daysBeforeEvent` (`-30` to `730`) for timeline milestones.
  2. `reconcileAiBudgetAllocations` (`src/utils/financials.ts`) converts percentages into integer currency allocations and reconciles any rounding remainder on the final active category.
  3. `calculateMilestoneDueDate` (`src/utils/timeline.ts`) and `IsoDateSchema` (`src/schemas/validation.ts`) enforce calendar-valid UTC dates via `parseIsoDateStrict` and `isValidIsoCalendarDate`.
- **Verification**: Tested in `tests/gatherly.test.ts` (reconciliation across arbitrary budgets, cancelled final items, and leap-year/impossible date rejection).

---

## ADR-03: Deep Context Bounding, Delimited Untrusted Blocks & Human-in-the-Loop Copilot Mutations
- **Context**: An event-planning copilot receives user-editable event fields (expense titles, task titles, dietary notes) alongside the chat message. Untrusted fields could carry indirect prompt injection payloads or oversized arrays.
- **Decision**:
  1. `CopilotRequestSchema` and `CopilotEventContextSchema` (`src/schemas/validation.ts`) bound every string and cap `tasksSummary` (`.max(20)`) and `expensesSummary` (`.max(20)`).
  2. `inspectCopilotPayloadForInjection` scans both the user `message` and every nested `eventContext` string via `detectPromptInjection` before calling Gemini.
  3. Untrusted context is wrapped in `<untrusted_event_context>` and `<untrusted_user_message>` tags with explicit system instructions never to follow instructions inside those tags.
  4. Validated tool calls (`CopilotFunctionArgsSchemas`) are returned as `proposedActions` (`requiresConfirmation: true`, `status: 'pending'`) and only mutate state when the user clicks **Confirm & Apply** in `src/features/copilot/CopilotPanel.tsx` (`handleExecuteCopilotAction` in `src/App.tsx`).
- **Verification**: `src/schemas/validation.ts`, `src/server/routes.ts`, and `tests/api.test.ts` (poisoned `eventContext.expensesSummary` rejection test).

---

## ADR-04: Immutable `createdAt` Separation & Collaborator-Aware Firestore Rules
- **Context**: Firestore Security Rules (`firestore.rules`) enforce `incoming().createdAt == existing().createdAt` on `update` operations and forbid calling `get()` inside `allow list` rules to prevent $O(N)$ billing spikes.
- **Decision**:
  1. `src/services/firebase.ts` separates `buildCreatePayload` (which sets `createdAt` and `updatedAt`) from `buildUpdatePayload` (which strips `id`, `ownerId`, `eventId`, and `createdAt`, setting only `updatedAt`).
  2. `collaboratorIds` (`size() <= 50`) is persisted on `/events/{eventId}` and propagated to subcollection documents so shared collaborators can list events and subcollections via `request.auth.uid in existing().collaboratorIds` without `get()` calls in `allow list`.
- **Verification**: `firestore.rules`, `npm run lint:rules`, and `firestore.rules.test.ts` (10 security rule tests).

---

## ADR-05: Route/Tab Code-Splitting & Bounded LRU Caching for Grounded Search
- **Context**: Loading all 7 workspace managers and Firebase SDKs in a single bundle increases initial parse time, and repeated Google Search grounding queries for the same city and vendor category incur redundant latency and quota usage.
- **Decision**:
  1. Lazy-load `EventCreationWizard`, `BudgetManager`, `TimelineManager`, `VendorManager`, `GuestManager`, `CopilotPanel`, and `CollaborationPanel` via `React.lazy` + `<Suspense>` in `src/App.tsx`, and split `vendor-firestore`, `vendor-firebase-core`, `vendor-react`, and `vendor-ui` in `vite.config.ts`.
  2. Cache grounded research responses in `ResearchLruCache` (`maxEntries = 50`, `ttlMs = 600_000`) keyed by normalized `city|category|queryTopic|currency`, returning `X-Cache: HIT` on repeat queries.
- **Verification**: `npm run build` chunk table and `tests/api.test.ts` (`X-Cache: MISS` -> `X-Cache: HIT` test).
