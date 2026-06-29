# Personal Finance App — Project Roadmap

> A 9-step plan from tech stack to production, built incrementally and shipped to a small group of friends.

---

## Progress tracker

| Step | Title | Status |
|---|---|---|
| 1 | Define the tech stack | ✅ Done |
| 2 | Define features and scope | ✅ Done |
| 3 | Design (UI/UX) | ✅ Done |
| 4 | Data modeling | ✅ Done |
| 5 | Project setup | ✅ Done |
| 6 | Build core features | ✅ Done |
| 7 | Testing | 🔄 In progress |
| 7.5 | Server Actions hardening | ✅ Done |
| 8 | Deployment | ⏳ Upcoming |
| 9 | Iterate | ⏳ Upcoming |

---

## Step 1 — Define the tech stack ✅

Lock in the tools before writing any code to avoid costly migrations later.

**Deliverables:**
- Tech stack selected and justified
- All layers covered: framework, database, ORM, auth, styling, charts, AI

**Outcome:** Next.js 14 + TypeScript + PostgreSQL (Supabase) + Prisma + Auth.js v5 + Tailwind CSS + shadcn/ui + Recharts + Anthropic API.

→ Documented in `finance-app-doc.md` — Tech stack section.

---

## Step 2 — Define features and scope ✅

Align on what the MVP actually does before designing anything.

**Deliverables:**
- Full list of MVP features with field-level detail
- Pages defined with their purpose
- Explicit out-of-scope list for the MVP

**Outcome:** 5 feature areas — Authentication, Transactions, Categories, Analytics, AI import — across 5 routes.

→ Documented in `finance-app-doc.md` — Features and scope section.

---

## Step 3 — Design (UI/UX) ✅

Wireframe every page before writing any code.

**Deliverables:**
- Wireframes for all 6 pages: `/login`, `/dashboard`, `/transactions`, `/categories`, `/import`, and the Add transaction modal
- Navigation structure decided: sidebar
- Date/filter scope decided: per-widget on dashboard, per-page on transactions

**Key design decisions:**
- Sidebar navigation instead of topbar
- "Add transaction" opens a modal (manual input only)
- AI import has its own dedicated page — not part of the modal
- Dashboard includes a recent transactions widget linking to the full list
- Bar chart uses a span selector (6 mo / YTD / 1 yr), other charts use per-widget month switchers

→ Visual wireframes built as interactive prototype.

---

## Step 4 — Data modeling ✅

Designed the full database schema before scaffolding the project.

**Models built:** `User`, `FinancialAccount`, `Category`, `Transaction`, `Budget` + Auth.js adapter tables.

**Key decisions made:**
- `FinancialAccount` renamed from `Account` to avoid Auth.js adapter collision
- Transaction amounts always stored as positive; `type` enum (`INCOME | EXPENSE | TRANSFER`) determines sign at query time
- `categoryId` and `accountId` are nullable on `Transaction` to support unclassified AI imports
- `importSource` field distinguishes manual vs AI-imported transactions
- All models carry `userId` for per-user data isolation at the database level
- `balance` on `FinancialAccount` is an opening balance only — current balance is computed from transactions at query time via `getAccountsWithBalances(userId)` in `src/lib/accounts.ts`
- Prisma pinned to v6 for Auth.js + Supabase compatibility
- `@@unique([userId, name])` on `Category` for idempotent seeding

---

## Step 5 — Project setup ✅

Codebase fully scaffolded, auth working end-to-end.

**What was built:**
- Next.js 14 app with TypeScript, Tailwind CSS, App Router, src/ directory
- Prisma v6 connected to Supabase (pooled port 6543 + direct port 5432)
- Auth.js v5 with Google OAuth + email whitelist (`ALLOWED_EMAILS` env var)
- Split auth config: edge-safe `auth.config.ts` for middleware, full `auth.ts` with PrismaAdapter for session
- JWT session strategy (Prisma adapter can't run on Edge runtime)
- shadcn/ui manually scaffolded (CLI incompatible with Tailwind v3.4)
- Route protection middleware covering all routes except `/login`
- App shell: `src/app/(app)/layout.tsx` route group with sidebar, session check

**Environment variables configured:**
- `DATABASE_URL` — Supabase pooled connection (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432, for migrations)
- `AUTH_SECRET` — generated via `npx auth secret`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google Cloud Console
- `ALLOWED_EMAILS` — comma-separated whitelist
- `ANTHROPIC_API_KEY` — from console.anthropic.com

---

## Step 6 — Build core features ✅

All five feature areas built and working.

### 6.1 — Authentication ✅
- Login page with "Sign in with Google" button
- Email whitelist enforced in both `signIn` callback and middleware
- Session available across all pages via JWT
- Route protection middleware redirects unauthenticated users to `/login`

### 6.2 — Categories ✅
- `/categories` page: list, create, edit, delete
- Each category has name, color (12 presets), emoji icon, optional monthly budget limit
- Monthly budget limit creates/updates a `Budget` row (period: MONTHLY) behind the scenes
- Default categories seeded on first login via Auth.js `events.createUser` + page-level safety net
- Default categories: Housing, Groceries, Transport, Dining, Entertainment, Health, Savings, Income
- Server Actions for all mutations

### 6.3 — Transactions ✅
- `/transactions` page: list ordered by date desc
- Each row: date, description, category swatch + name, amount (green/red), AI badge (purple) if `importSource === "ai_import"`
- Filter bar: month prev/next arrows + category dropdown — URL-driven (`?month=&category=`)
- Add/edit modal: amount, INCOME/EXPENSE toggle, category select, account select (optional), description, date
- Delete with confirm dialog
- `importSource` defaults to `"manual"` on create, preserved on edit
- Ownership enforced server-side on all mutations

### 6.4 — Dashboard ✅
- Summary stat cards: Total Income, Total Expenses, Net Balance, Net Worth (all accounts combined via `getAccountsWithBalances`)
- Bar chart: income vs expenses, Recharts BarChart, span selector (6 mo / YTD / 1 yr)
- Donut chart: spending by category this month, slice color = category color, Recharts PieChart
- Line chart: cumulative daily net balance for selected month, Recharts LineChart, per-widget month switcher
- Budget progress bars: spent vs limit per category, red if over budget, per-widget month switcher
- Recent transactions widget: last 5, with "View all" link to `/transactions`
- All data fetched server-side; charts are client components (Recharts requirement)
- Shared helper `src/lib/accounts.ts` → `getAccountsWithBalances(userId)` used by both dashboard and accounts page

### 6.5 — AI screenshot import ✅
- `/import` page with drag-and-drop upload zone, thumbnail previews
- `POST /api/import` route: base64 image → Anthropic API (`claude-sonnet-4-6` vision) → structured JSON
- System prompt extracts date, description, amount, type (INCOME/EXPENSE) from bank screenshots
- Confirmation table: checkbox per row, inline editing of all fields, category + account dropdowns
- Only checked rows saved on confirm, all with `importSource: "ai_import"`
- Redirects to `/transactions` on success
- Error handling: missing key → 500, invalid image → 400, unreadable output → 422, rate limit → 429
- Loading states: spinner on Extract and Save buttons

**Notes:**
- Income vs expense on the dashboard is determined by the `type` field, not the category name
- The "Income" default category is cosmetic — recommend renaming to "Salary" or "Revenue" to avoid confusion
- Anthropic API requires separate paid account at console.anthropic.com (pay-per-token, ~$0.01–0.03 per import)

---

## Step 7 — Testing 🔄

Manual testing across users and edge cases before inviting friends.

**Checklist:**
- [ ] All CRUD operations work correctly for transactions, categories, and accounts
- [ ] Month filters return accurate results
- [ ] Charts reflect real data correctly
- [ ] Account balance computed correctly from transactions
- [ ] Budget progress bars reflect real spending vs limits
- [ ] AI import tested with real bank screenshots
- [ ] Purple AI badge appears on imported transactions
- [ ] Data isolation verified — user A cannot access user B's data
- [ ] Whitelisted emails can log in, non-whitelisted are blocked
- [ ] App works on mobile screen sizes

---

## Step 7.5 — Server Actions hardening ✅

API-design review of the Categories, Transactions, Accounts, Import and Reset Server Actions, followed by a consistency/safety refactor. Reviewed against an adapted REST rubric (consistency, auth/user-scoping, error format, naming, App Router anti-patterns) since the app exposes Server Actions rather than a REST surface.

**Shared foundation — `src/lib/actions.ts` (new):**
- `ActionResult<T = void>` — single source of truth for action return shapes, replacing four duplicated `ActionResult` copies plus `SaveResult` / `ResetResult`. Generic so data-returning actions (e.g. import) use `ActionResult<{ count: number }>`. Added optional `field?` so the client can highlight the offending input.
- `action(fn)` wrapper — enforces auth and injects `userId` (the auth check is now structurally impossible to omit when adding a new action), and wraps every action body in try/catch so a thrown DB/runtime error returns a clean `{ ok: false }` instead of leaking as a raw Server Component render error. Maps Prisma `P2002` (unique violation) to a friendly message — the real backstop for the duplicate-name race.
- `revalidateFinance()` — `revalidatePath("/", "layout")`, refreshing all `(app)` pages so a mutation in one feature no longer leaves the dashboard/other pages stale.

**Applied across all five action files** (`categories`, `transactions`, `accounts`, `import`, `reset-action`):
- Removed the 12× repeated `auth()` boilerplate and per-file result types.
- Every mutation calls `revalidateFinance()` instead of revalidating only its own route (fixes stale cross-page data).
- Validation errors carry `field` (e.g. `name`, `amount`) for inline form feedback.
- `delete*` actions collapsed to atomic `deleteMany({ where: { id, userId } })` with a `count === 0 → not found` check.

**Validation consistency:**
- `src/lib/transactions.ts` (new) — pure shared parsers (`parseAmount`, `parseTransactionDate`, `isTransactionType`, `normalizeDescription`) used by both manual entry and AI import so the two paths can't diverge.
- `src/lib/transaction-constants.ts` (new) — `TRANSACTION_TYPES` (`INCOME`, `EXPENSE`) as the source of truth for supported types, mirroring the `account-constants.ts` pattern.
- `src/lib/validation.ts` (new) — `MAX_NAME_LENGTH` (60), `MAX_DESCRIPTION_LENGTH` (200) enforced on category/account names and transaction descriptions; import truncates long descriptions rather than rejecting a whole batch.

**Schema note:**
- `TransactionType.TRANSFER` documented as reserved (not yet accepted by UI/actions); kept in the enum so the future transfer feature avoids a destructive enum migration. Comment-only change — no `db push` required.

**Verified:** `tsc --noEmit` clean; `next build` compiles, passes type-checking, and generates all 11 pages.

**Deliberately left open (low priority):** transaction UI labels not yet wired to `TRANSACTION_TYPE_LABELS` (cosmetic).

---

## Step 8 — Deployment ⏳

Ship the app to production and invite friends.

**Deliverables:**
- Next.js app deployed on Vercel (connected to GitHub repo, auto-deploys on push)
- Production environment variables set in Vercel dashboard
- Supabase database on production plan (or free tier if within limits)
- OAuth redirect URLs updated to production domain in Google Cloud Console
- Friends' emails added to `ALLOWED_EMAILS`
- App URL shared with the group

**Production environment variables:**
- `DATABASE_URL` — Supabase pooled connection string
- `DIRECT_URL` — Supabase direct connection string
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `AUTH_SECRET` — generated via `npx auth secret`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth credentials
- `ALLOWED_EMAILS` — comma-separated list of allowed emails

---

## Step 9 — Iterate ⏳

Collect feedback from real users and improve the app over time.

**First feedback loop:**
- Share the app with friends and observe usage
- Collect missing features or pain points
- Monitor Anthropic API usage and costs in console.anthropic.com

**Likely next features (post-MVP):**
- Export transactions to CSV
- Dedicated Budgets management page
- Recurring / scheduled transactions
- Multi-currency support
- Improved mobile experience
- More chart options or date range flexibility
- Email notifications for budget overruns
- Rename default "Income" category to "Salary" / "Revenue"

---

## Timeline (reference)

| Phase | Steps | Estimated effort |
|---|---|---|
| Planning and design | 1 → 3 | Done |
| Foundation | 4 → 5 | Done |
| Feature build | 6 | Done |
| QA and launch | 7 → 8 | 2–3 days |
| Ongoing | 9 | Continuous |