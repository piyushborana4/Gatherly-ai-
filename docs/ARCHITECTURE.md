# Gatherly AI — System Architecture

**Product:** Gatherly AI ("Every Occasion. Thoughtfully Planned.")  
**Runtime Stack:** React 19 + TypeScript 5.8 (Strict Mode) + Tailwind CSS 4 + Express 4 + Google Gemini (`@google/genai`) + Firebase Auth & Cloud Firestore + Firebase Admin SDK

---

## 1. High-Level Topology

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 React 19 SPA (Vite + Tailwind CSS 4)                         │
│  Typography: Newsreader (Display) · DM Serif Display · Manrope (Body/UI)     │
│  Eager Shell: LandingPage │ EventOverviewPanel                               │
│  Lazy Chunks (React.lazy + Suspense):                                        │
│    EventCreationWizard │ BudgetManager │ TimelineManager │ VendorManager     │
│    GuestManager │ CopilotPanel │ CollaborationPanel                          │
└──────────────────────┬────────────────────────────────────┬──────────────────┘
                       │ Deterministic Client Engines       │ HTTPS JSON + Bearer ID Token
                       ▼                                    ▼
┌──────────────────────────────────────────┐ ┌─────────────────────────────────┐
│     Shared Domain & Validation Layer     │ │  Express Backend (src/server/*) │
│ • Zod Schemas (src/schemas/validation.ts)│ │ • src/server/app.ts             │
│ • Financial Math (src/utils/financials.ts)│ │ • src/server/middleware.ts      │
│ • Timeline/DAG (src/utils/timeline.ts)   │ │ • src/server/gemini.ts          │
│ • Smart Insights (src/utils/insights.ts) │ │ • src/server/routes.ts          │
└──────────────────────┬───────────────────┘ └──────────────┬──────────────────┘
                       │                                    │
                       ▼                                    ▼
┌──────────────────────────────────────────┐ ┌─────────────────────────────────┐
│  Firebase Auth + Cloud Firestore         │ │       Google Gemini API         │
│ • Auth: Google OAuth (signInWithPopup)   │ │ • Model: process.env.GEMINI_MODEL│
│ • Admin Verification: firebase-admin/auth│ │   (default: gemini-3.8-flash)   │
│ • DB: events/{id} + 5 subcollections     │ │ • Interactions API & Search     │
│ • Security: firestore.rules (RBAC)       │ │ • LRU Grounding Cache (50/10m)  │
└──────────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 2. Backend Modules, Endpoints & Limits

The Express backend is modularized under `src/server/` (`src/server/app.ts`, `src/server/middleware.ts`, `src/server/gemini.ts`, `src/server/routes.ts`), re-exported by `server.ts`, and bundled to `dist/server.js` for production (`npm start`).
- **Port & Proxy**: Honours `process.env.PORT` in production (`Number(process.env.PORT) || 8080`) while binding to port `3000` in development (`PORT`), and configures `app.set('trust proxy', 1)` for Cloud Run in `createApp`.
- **Security Headers & Body Cap**: Enforces `helmet` with an explicit Content Security Policy (`contentSecurityPolicy`), explicit `cors` origin validation against `process.env.APP_URL`, and `express.json({ limit: '256kb' })`.
- **Authentication & Rate Limiting**: All `/api/ai/*` routes require a verified Firebase ID token (`Authorization: Bearer <token>` verified via `createAuthMiddleware` / `requireFirebaseAuth` and `getDefaultTokenVerifier` using `firebase-admin/auth` `verifyIdToken`). Rate limiting is enforced per authenticated `uid` (fallback `req.ip`) via `createRateLimiter` at `RATE_LIMIT_MAX_REQUESTS = 20` requests per `RATE_LIMIT_WINDOW_MS = 60_000` ms, with stale-entry eviction when `store.size > 200` and `Retry-After` headers.
- **Timeouts & Retries**: All Gemini API calls enforce a `25,000ms` (`GEMINI_TIMEOUT_MS = 25_000`) per-request `AbortSignal.timeout` inside `withRetry`.
- **Error Masking & Cloud Logging**: Unexpected 500 errors return a generic client message with a correlation `requestId` (`crypto.randomUUID()`) while emitting structured JSON logs (`severity`, `logging.googleapis.com/trace`, `requestId`, `uid`, `endpoint`) via `logStructuredError`.

| Method & Path | Purpose | Input Validation | Gemini Capabilities & Caching |
| :--- | :--- | :--- | :--- |
| `GET /api/health` | Liveness and configuration probe | None | Reports server status, active `GEMINI_MODEL`, and whether `GEMINI_API_KEY` is configured |
| `POST /api/ai/generate-plan` | Generates a structured event blueprint, reconciled budget ledger, backward-scheduled milestones, and vendor recommendations | `EventWizardInputSchema` (Zod) + `detectPromptInjection` + `<untrusted_event_parameters>` delimiters | `ai.interactions.create` (fallback `ai.models.generateContent`) with JSON schema enforcement (`PLAN_RESPONSE_SCHEMA`), validated post-generation via `AiGeneratedPlanSchema.parse` |
| `POST /api/ai/copilot` | Context-aware planning assistant that answers questions and proposes structured mutations requiring user confirmation | `CopilotRequestSchema` and `CopilotEventContextSchema` (`tasksSummary` `.max(20)`, `expensesSummary` `.max(20)`) + `inspectCopilotPayloadForInjection` + `<untrusted_event_context>` / `<untrusted_user_message>` delimiters | `ai.interactions.create` with 7 `function` tools (`COPILOT_TOOLS`: `update_event_budget`, `update_guest_count`, `add_timeline_task`, `move_task_deadline`, `add_expense_item`, `add_vendor_suggestion`, `rebalance_category_allocations`) or `google_search` grounding when `enableSearchGrounding` is true |
| `POST /api/ai/research` | Live city-and-category vendor and venue market intelligence | `ResearchRequestSchema` + `detectPromptInjection` + `<untrusted_research_query>` delimiters | `ai.interactions.create` with `tools: [{ type: 'google_search' }]`, `extractSearchGroundingSources`, and `ResearchLruCache` (`maxEntries = 50`, `ttlMs = 600_000`, `X-Cache: HIT` / `MISS`) |

---

## 3. Deterministic Financial & Timeline Engines

AI models never directly compute currency balances or calendar dates stored in the ledger:

1. **Financial Ledger (`src/utils/financials.ts`)**:
   - Gemini outputs `percentageOfTotal` per budget category.
   - `reconcileAiBudgetAllocations` normalizes weights and reconciles rounding remainders on the final active category so `sum(allocatedAmount) === Math.round(totalBudget)` to the exact rupee/dollar.
   - `calculateBudgetSummary` computes planned, actual, deposit, pending balance, and per-guest metrics in a single $O(N)$ pass while excluding `cancelled` items and rejecting negative numbers.
   - `recalculateAllocationsForNewTotal` proportionally scales active category allocations and reconciles the final active item even if trailing items are `cancelled`.

2. **Timeline, Dependency & Google Calendar Engine (`src/utils/timeline.ts`)**:
   - `parseIsoDateStrict` and `isValidIsoCalendarDate` (`src/schemas/validation.ts`) verify calendar-accurate UTC dates (rejecting impossible dates like `2026-02-30`).
   - `calculateMilestoneDueDate` converts relative AI offsets (`daysBeforeEvent`) into valid ISO dates.
   - `evaluateTasksAndDependencies` builds an $O(1)$ task lookup map and flags overdue (`isOverdue`) and dependency-blocked tasks (`isBlockedByDependency`).
   - `buildGoogleCalendarUrl` generates an official Google Calendar template deep-link rendered on every milestone card in `src/features/timeline/TimelineManager.tsx`.

---

## 4. Authentication, Persistence & Firestore Security Rules

- **Authentication (`src/services/firebase.ts`)**:
  - Uses Firebase Authentication with **Google OAuth** (`GoogleAuthProvider` + `signInWithPopup` in `signInWithGoogle`).
  - Displays an Email Verification Banner in `src/App.tsx` with a one-click `sendVerificationEmailToCurrentUser` trigger (`sendEmailVerification`) if an authenticated account has `emailVerified === false`.
  - Separates document creation (`buildCreatePayload`, which sets `createdAt` and `updatedAt`) from document updates (`buildUpdatePayload`, which strips immutable keys `id`, `ownerId`, `eventId`, `createdAt` and only updates `updatedAt`).
  - Provides a zero-sign-in interactive sandbox pre-loaded with 3 Indian and community sample events (`src/utils/demoData.ts`: `createMumbaiWeddingDemoBundle`, `createAdditionalDemoBundles`) so evaluators can inspect every workflow before signing in.
- **Firestore Data Model (`firestore.rules` & `firebase-blueprint.json`)**:
  - `/users/{userId}` — Organizer profile document validated by `isValidUserProfile` and owned strictly by `request.auth.uid == userId`.
  - `/events/{eventId}` — Root event plan document validated by `isValidEventPlan` with `ownerId` and `collaboratorIds` (`size() <= 50`).
  - `/events/{eventId}/{subcollection}/{docId}` — Subcollections for `expenses` (`isValidExpenseItem`), `tasks` (`isValidTimelineTask`), `vendors` (`isValidVendorRecord`), `guests` (`isValidGuestRecord`), and `collaborators` (`isValidCollaboratorRecord`), each storing `ownerId` and `collaboratorIds` so `allow list` queries are authorized without calling `get()` inside list rules.
- **API Key & App Check Security**:
  - `GEMINI_API_KEY` is read exclusively in the Node.js server process (`src/server/gemini.ts`) and is never exposed in client-side `VITE_*` variables.
  - Client-side Firebase configuration in `firebase-applet-config.json` is governed by `firestore.rules` and optional Firebase App Check (`VITE_FIREBASE_APPCHECK_SITE_KEY` via `initializeAppCheck` and `ReCaptchaV3Provider`).
