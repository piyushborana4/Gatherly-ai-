# Gatherly AI — Every Occasion. Thoughtfully Planned.

**Gatherly AI** is a full-stack, GenAI-powered event-planning platform built for **Google Virtual Prompt Wars 5**. It transforms an event concept—whether a multi-day Indian wedding in Mumbai or Jaipur, a milestone family birthday, or a regional community summit—into a complete, financially reconciled, and collaborative operational blueprint.

---

## 1. Problem Statement & Target Users

Event organizers face three recurring failure modes when planning complex gatherings:
1. **Unreconciled AI Hallucinations**: Generic AI chatbots invent rough percentages that do not sum to the organizer's actual budget cap or output impossible calendar dates.
2. **Disconnected Spreadsheets**: Budgets, backward-scheduled task dependencies, vendor quotes, guest dietary/RSVP matrices, and collaborator permissions live in separate tools.
3. **Unsafe AI Mutations**: Allowing an LLM to directly mutate financial ledgers or timelines without schema validation and human-in-the-loop confirmation risks accidental data loss and indirect prompt injection.

**Gatherly AI solves this** by combining **Google Gemini (`@google/genai`)** structured outputs, function calling, and live Google Search grounding with **deterministic TypeScript financial and calendar engines**, **Firebase Authentication**, **Cloud Firestore** with strict role-based security rules (`owner`, `editor`, `viewer`), and a **Warm Luxury Editorial** interface designed in **Google Stitch**.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 React 19 SPA (Vite 8 + Tailwind CSS 4)                       │
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

For detailed architectural specifications and engineering trade-offs, see:
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/DECISIONS.md`](./docs/DECISIONS.md)
- [`security_spec.md`](./security_spec.md)

---

## 3. Google Services & Technologies Integration

| Google Service / Technology | Concrete Implementation in Repository | Purpose & Value |
| :--- | :--- | :--- |
| **Google Gemini API (`@google/genai`)** | `src/server/gemini.ts`, `src/server/routes.ts` (`GEMINI_MODEL`, default `gemini-3.8-flash`) | Server-side AI orchestration with `AbortSignal.timeout` (`GEMINI_TIMEOUT_MS = 25_000`) and exponential backoff retry (`withRetry`). |
| **Gemini Structured Outputs (JSON Schema)** | `POST /api/ai/generate-plan` (`PLAN_RESPONSE_SCHEMA` + `AiGeneratedPlanSchema.parse`) | Generates a structured event blueprint, percentage budget allocations, relative timeline offsets, and vendor recommendations. |
| **Gemini Function Calling (7 Tools)** | `POST /api/ai/copilot` (`COPILOT_TOOLS` + `CopilotFunctionArgsSchemas`) | Proposes auditable mutations (`update_event_budget`, `update_guest_count`, `add_timeline_task`, `move_task_deadline`, `add_expense_item`, `add_vendor_suggestion`, `rebalance_category_allocations`) with human-in-the-loop confirmation. |
| **Gemini Google Search Grounding** | `POST /api/ai/research` & `POST /api/ai/copilot` (`extractSearchGroundingSources`) | Retrieves live local market benchmarks and clickable source citations (`groundingSources`), cached via `ResearchLruCache` (`maxEntries = 50`, `ttlMs = 600_000`). |
| **Firebase Authentication (Google OAuth)** | `src/services/firebase.ts` (`GoogleAuthProvider`, `signInWithPopup`, `sendEmailVerification`) & `src/server/middleware.ts` (`createAuthMiddleware`, `requireFirebaseAuth`, `verifyIdToken`) | Authenticates users on the client (`getFirebaseIdToken`) and verifies `Authorization: Bearer <token>` on all `/api/ai/*` server routes. |
| **Cloud Firestore & Security Rules** | `firestore.rules`, `firebase-blueprint.json`, `src/services/firebase.ts` | Real-time persistence across `/events/{eventId}` and 5 subcollections (`expenses`, `tasks`, `vendors`, `guests`, `collaborators`) with `owner` / `editor` / `viewer` RBAC and zero `get()` calls inside `allow list` rules. |
| **Firebase App Check** | `src/services/firebase.ts` (`initializeAppCheck`, `ReCaptchaV3Provider`) | Automatically activates browser attestation when `VITE_FIREBASE_APPCHECK_SITE_KEY` is configured. |
| **Google Calendar Deep-Links** | `src/utils/timeline.ts` (`buildGoogleCalendarUrl`) & `src/features/timeline/TimelineManager.tsx` | Every milestone task card includes a `+ Google Calendar` link that opens `calendar.google.com/calendar/render` pre-filled with the milestone date, location, stage, and priority. |
| **Google Stitch + Google Fonts** | `index.html`, `src/index.css`, `src/components/LandingPage.tsx`, `src/features/copilot/CopilotPanel.tsx` | Warm Luxury Editorial design system using Google Fonts (`Newsreader`, `DM Serif Display`, `Manrope`) and `Material Symbols Outlined`. |
| **Google Cloud Run, Cloud Build & Cloud Logging** | `Dockerfile`, `cloudbuild.yaml`, `src/server/middleware.ts` (`logStructuredError`) | Multi-stage Node 22 Alpine container with `/api/health` `HEALTHCHECK`, automated Cloud Build pipeline, and Cloud Logging structured error logs (`severity`, `logging.googleapis.com/trace`, `requestId`). |

---

## 4. Security, Financial Integrity & Accessibility Highlights

- **Zero Client-Side Secret Exposure**: `GEMINI_API_KEY` is accessed solely inside `src/server/gemini.ts` (`getDefaultGeminiClient`) and never bundled into client code.
- **Authenticated & Rate-Limited AI Endpoints**: All `/api/ai/*` endpoints require a verified Bearer token (`createAuthMiddleware` / `requireFirebaseAuth`) and enforce per-UID sliding-window rate limiting via `createRateLimiter` (`RATE_LIMIT_MAX_REQUESTS = 20` requests per `RATE_LIMIT_WINDOW_MS = 60_000` ms, with `Retry-After` headers and stale-entry eviction when `store.size > 200`).
- **Deep Prompt Injection Defense**: `CopilotRequestSchema` and `CopilotEventContextSchema` bound every nested `eventContext` field and array size (`tasksSummary` `.max(20)`, `expensesSummary` `.max(20)`), `inspectCopilotPayloadForInjection` scans both user messages and nested context fields via `detectPromptInjection`, and untrusted inputs are isolated inside `<untrusted_event_context>`, `<untrusted_user_message>`, `<untrusted_event_parameters>`, and `<untrusted_research_query>` tags.
- **Deterministic Financial Reconciliation**: `reconcileAiBudgetAllocations` and `recalculateAllocationsForNewTotal` (`src/utils/financials.ts`) guarantee that category allocations sum to `Math.round(totalBudget)` to the exact rupee/dollar, even when trailing expenses are marked `cancelled`.
- **Immutable `createdAt` Separation**: `buildCreatePayload` and `buildUpdatePayload` (`src/services/firebase.ts`) ensure update operations never overwrite `createdAt`, `id`, `ownerId`, or `eventId`.
- **WCAG AA Accessibility Verified via `vitest-axe`**: Visible `:focus-visible` outlines (`#B84B32`), skip-to-main-content link, modal focus trapping and `Escape` dismissal (`EventCreationWizard`), explicit `htmlFor`/`id` form labels, and `role="alert"` / `aria-live` status regions verified across 5 core feature views in `tests/components.a11y.test.tsx`.

---

## 5. Known Limitations & Transparency Notes

1. **Local Firestore Emulator Requires a JVM (`java`)**:
   - `firestore.rules.test.ts` includes both a live `@firebase/rules-unit-testing` suite and a 7-scenario behavioral rule evaluator + static contract suite.
   - In container environments without a `java` binary, the live emulator block is cleanly skipped (`describe.runIf(Boolean(process.env.FIRESTORE_EMULATOR_HOST))`) while the 10 static and behavioral rule tests execute locally. In GitHub Actions CI (`.github/workflows/ci.yml`), `actions/setup-java@v4` (Temurin JDK 21) runs the full Firestore emulator suite on every push.
2. **Google Calendar Integration Scope**:
   - Milestones integrate with Google Calendar via zero-permission template deep-links (`buildGoogleCalendarUrl`) rather than background OAuth calendar write scopes, allowing organizers to add milestones to their personal or shared calendars without granting broad calendar write access.
3. **Browser Firebase API Key Scope**:
   - As standard for Firebase Web SDK apps, `firebase-applet-config.json` contains project identification keys governed by `firestore.rules`. For production custom domains, HTTP referrer restrictions and `VITE_FIREBASE_APPCHECK_SITE_KEY` should be enabled in Google Cloud Console.

---

## 6. Two-Minute Judge Evaluation Script

1. **Explore the Editorial Landing Page (`0:00 - 0:20`)**:
   - Inspect the Warm Luxury Editorial showcase or click **Launch Interactive Demo** in the top navigation bar to enter the workspace with 3 pre-loaded events from `src/utils/demoData.ts` (`createMumbaiWeddingDemoBundle` and `createAdditionalDemoBundles`).
2. **Audit the Financial Ledger & Timeline (`0:20 - 0:50`)**:
   - Open **Budget & Escrow** (`src/features/budget/BudgetManager.tsx`) to inspect the 100% reconciled category allocations, planned vs. actual spend, and deposits paid.
   - Open **Timeline & Muhurat** (`src/features/timeline/TimelineManager.tsx`) to filter milestones, inspect dependency-blocked tasks, and click **+ Google Calendar** on any milestone card.
3. **Run Grounded Vendor Discovery (`0:50 - 1:20`)**:
   - Open **Vendors & Venues** (`src/features/vendors/VendorManager.tsx`), enter a research topic, and click **Run Grounded Search** (`fetchGroundedMarketResearch`) to retrieve live Google Search grounded benchmarks and clickable source citations.
4. **Stage & Confirm a Gemini Copilot Mutation (`1:20 - 2:00`)**:
   - Open **Gemini Copilot** (`src/features/copilot/CopilotPanel.tsx`).
   - Click a quick-action prompt or ask to adjust the budget or move a task deadline (`sendCopilotMessage`).
   - Review the staged **Proposed Plan Changes** card (`requiresConfirmation: true`) and click **Confirm & Apply** (`handleExecuteCopilotAction`) to execute the deterministic mutation across the workspace.

---

## 7. Local Setup & Verification Commands

### Prerequisites
- Node.js 22+
- Set `GEMINI_API_KEY` in `.env` (see `.env.example`)

### Install & Run
```bash
npm install
npm run dev
```

### Verification Suite (Lint, Doc Audit, Typecheck, Security Rules, Unit/API/A11y Tests, Coverage & Production Build)
```bash
# 1. TypeScript strict typecheck (--noEmit) + ESLint (including firestore.rules) + Doc identifier verification
npm run lint

# 2. Verify all backticked identifiers and file paths in README.md and docs/* exist in the codebase
npm run verify:docs

# 3. Run all 40 unit, API integration, component accessibility (vitest-axe), and security rule tests
npm test

# 4. Run test suite with v8 coverage thresholds (>= 70% lines, functions, statements)
npx vitest run --coverage

# 5. Build production client chunks (dist/) and bundle Express server (dist/server.js)
npm run build
```

---

## 8. Deploying to Netlify

Gatherly AI is pre-configured for zero-config deployment on **Netlify** using `netlify.toml`, `netlify/functions/api.ts` (`serverless-http` wrapping `createApp`), and `public/_redirects`:

1. **Connect Repository in Netlify**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions` (configured automatically via `netlify.toml`)
2. **Configure Netlify Environment Variables** (*Site configuration -> Environment variables*):
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `GEMINI_MODEL`: `gemini-3.8-flash` (optional, defaults to `gemini-3.8-flash`)
   - Note: Netlify automatically injects `URL` and `DEPLOY_PRIME_URL`, which `src/server/app.ts` trusts in its CORS allowlist (`allowedOrigins`).
3. **Authorize Your Netlify Domain in Firebase Authentication**:
   - In the Firebase Console -> **Authentication** -> **Settings** -> **Authorized domains**, add your `*.netlify.app` domain so `signInWithPopup` Google OAuth succeeds in production.

