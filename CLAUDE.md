# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Invite-only personal finance tracker for ~10 users (Google OAuth + email whitelist). Each user sees only their own data. **Performance at scale is explicitly a non-goal** — favor clarity over optimization. Stack: Next.js 14 (App Router) + TypeScript, Prisma v6 + Supabase Postgres, Auth.js v5, Tailwind v3.4 + shadcn/ui, Recharts, Anthropic API, Enable Banking (PSD2 open banking import).

See `README.md` for first-time setup, environment variables, and Google OAuth configuration. See `finance-app-roadmap.md` for build history and planned work.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000 (-> /login)
npm run build        # production build; also typechecks + lints
npm run lint         # ESLint
npx tsc --noEmit     # typecheck only (fast; use after edits)
npm run db:push      # push schema.prisma to the DB — this project's DB workflow
npm run db:generate  # regenerate Prisma client after schema changes
npm run db:studio    # browse/edit data
npm run db:seed      # run prisma/seed.ts (default categories for a test user)
```

There is **no automated test suite** — testing (Step 7) is manual. Verify changes with `npx tsc --noEmit` then `npm run build`.

## Server Actions — the central convention

All mutations are Server Actions, and they follow one mandatory pattern built around `src/lib/actions.ts`. Read that file before writing or changing any action.

- **Wrap every action with `action(fn)`.** It enforces authentication, injects the signed-in `userId` as the first arg, and converts any thrown error into a clean result (incl. mapping Prisma `P2002` to a friendly message). **Never call `auth()` by hand in an action** — the wrapper makes the auth check impossible to omit.
  ```ts
  export const createThing = action(async (userId, formData: FormData): Promise<ActionResult> => { ... });
  ```
- **Return `ActionResult<T>`** (`{ ok: true; data? } | { ok: false; error; field? }`) — the single source of truth for action shapes. Use `field` so the client can highlight the offending input. Data-returning actions use `ActionResult<{ ... }>`.
- **Call `revalidateFinance()` after every mutation**, not `revalidatePath("/specific-route")`. Finance data is cross-cutting (dashboard, transactions, categories all read the same tables); revalidating a single route leaves other pages stale.
- **Scope every query to `userId`.** For ownership-checked writes prefer atomic `deleteMany`/`updateMany({ where: { id, userId } })` with a `count === 0` → not-found check.
- **Validation runs before the DB**, using the shared pure parsers in `src/lib/transactions.ts` and constants in `src/lib/{transaction,account,category}-constants.ts` + length caps in `src/lib/validation.ts`. Reuse these — do not inline new parsing logic.

Action files live next to their feature: `src/app/(app)/<feature>/actions.ts`.

Note: **list/filter is NOT an action.** Filtering (e.g. transactions by month/category) is done in the page Server Component via `searchParams` (URL state) — keep it that way.

## Auth & data isolation

- **Split Auth.js config.** `src/auth.config.ts` is Edge-safe (no Prisma) and used by `src/middleware.ts`; `src/auth.ts` spreads it and adds the Prisma adapter. Sessions are **JWT** (not database) so the email whitelist is enforceable in middleware. The whitelist is checked in *both* the `signIn` callback and the middleware.
- `middleware.ts` protects every route except `/login`.
- Default categories are seeded on first sign-in via the Auth.js `createUser` event (`ensureDefaultCategories` in `src/lib/categories.ts`), with a page-level call as a safety net. The function is idempotent.
- The `next build` warnings about `jose` / `CompressionStream` in the Edge runtime are benign.

## Data model gotchas (don't "fix" without understanding)

- **`FinancialAccount`, not `Account`.** The Auth.js adapter requires a model literally named `Account` (OAuth links). The user's money account is `FinancialAccount`; `Transaction.accountId` → `FinancialAccount`.
- **Amounts are always stored positive**; direction comes from the `type` enum.
- **`TransactionType.TRANSFER` is reserved and NOT supported** by the UI or actions. `TRANSACTION_TYPES` in `src/lib/transaction-constants.ts` is the source of truth for supported types — gate on it.
- `Transaction.importSource` distinguishes `"manual"`, `"ai_import"`, and `"bank_sync"` (Enable Banking); defaults to `manual` on create and is preserved on edit.
- `Transaction.externalId` is the bank's stable transaction id (Enable Banking `entry_reference`, or a hash when absent); null for manual/AI rows. Unique per `(userId, externalId)` — this is the bank-sync dedup key. Postgres treats NULLs as distinct, so manual rows are unaffected.
- `categoryId`/`accountId` are nullable on `Transaction` (supports unclassified AI imports; `onDelete: SetNull`).
- **Account `balance` is opening balance only.** Current/derived balances come from `getAccountsWithBalances(userId)` in `src/lib/accounts.ts` — used by both the dashboard and accounts page.
- All app models carry a `userId` FK; `Category` is unique per `(userId, name)` for idempotent seeding.

## Bank sync (Enable Banking)

Automatic transaction import via Enable Banking (PSD2 AIS, **read-only**). Synced transactions land in a review queue and enter the ledger **only after the user approves them** — nothing is auto-posted.

- **The app authenticates with a signed JWT, not per-user OAuth.** `src/lib/enablebanking.ts` signs an RS256 JWT with the app's private key (via `jose`, already a transitive dep) for every API call; there is no per-user token. Per-user access is a `session_id` obtained after the user consents at their bank. Env vars: `ENABLE_BANKING_APP_ID`, `ENABLE_BANKING_PRIVATE_KEY` (the **base64-encoded** PKCS#8 PEM on one line — the client also accepts a raw or `\n`-escaped PEM), `ENABLE_BANKING_BASE_URL`, `ENABLE_BANKING_COUNTRY` (which country's banks the Accounts page lists; `FI` = sandbox Mock ASPSP).
- **Flow:** Accounts → Connect (`connectBank` action → `startAuth`) → user consents at bank → `GET /api/banking/callback` (a **Route Handler, not an action** — the bank redirects a browser GET) verifies a CSRF `state` cookie, exchanges the code (`createSession`), and creates **one `FinancialAccount` per bank account** plus a `BankConnection`. Sync (`syncBank` action → `syncUser`/`syncConnection` in `src/lib/bank-sync.ts`) pages transactions into `PendingTransaction`. Review (`src/app/(app)/review/`, `resolvePending` action) lets the user edit/approve/discard; approved rows become `Transaction`s (`importSource: "bank_sync"`) and learn `MerchantRule`s the same way AI import does. Shared helpers live in `src/lib/banking.ts`.
- **Only booked transactions import** (`status === "BOOK"`); pending bank entries are skipped because they can change or vanish.
- **Discards are permanent.** Rejecting a pending row flips `PendingTransaction.status` to `REJECTED` (a hidden tombstone) instead of deleting it, so its `externalId` keeps blocking re-staging on later syncs. The Review page and the sidebar badge only ever show `status: PENDING`.
- **Sync is manual by design** (a button on Accounts) — the user validates every batch. A daily cron (calling `syncUser` for all users) plus a consent-expiry reconnect nudge (`BankConnection.validUntil`, ~90 days) are the planned "make it automatic" step, **not yet built**.
- **`bank-sync.ts` is deliberately session-free** (explicit args, no `auth()`) so a future cron can reuse it. Keep it that way.
- **The sandbox Mock ASPSP starts empty** — you must paste synthetic transaction JSON during the consent flow or `GET /accounts/{id}/transactions` returns nothing. That is expected, not a bug. `scripts/eb-smoke.ts` verifies the JWT/key against the sandbox (`npx tsx scripts/eb-smoke.ts`).

## Other environment gotchas

- **Prisma pinned to v6** for Auth.js/Supabase compatibility (v7 changes generator output path, imports, and seed config). Keep standard `@prisma/client` imports.
- **DB workflow is `db push`, not migrations** — there is no `prisma/migrations/` folder. Schema changes go through `npm run db:push`. `DATABASE_URL` is the pooled connection (6543) for runtime; `DIRECT_URL` is direct (5432) for DDL.
- **shadcn/ui was scaffolded manually** (CLI is Tailwind-v4-first; this is Tailwind v3.4). Add components via `npx shadcn@2 add <component>`, or copy source into `src/components/ui/` if the CLI errors.
- `recharts@3` and `lucide-react@1` are newer than most tutorials assume — APIs may differ from older examples.
- Charts are client components (Recharts requirement); all data is fetched server-side and passed down.
