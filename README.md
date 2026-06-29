# Finance App

An invite-only personal finance tracker for a small group (~10 users). Each user
sees only their own data; access is gated by Google OAuth **plus** an email
whitelist.

## Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js 14 (App Router) + TypeScript, `src/` dir    |
| Database       | PostgreSQL via Supabase                              |
| ORM            | Prisma **v6** (see note below)                       |
| Auth           | Auth.js v5 (`next-auth@5` beta) + Prisma adapter     |
| Access control | Google OAuth + `ALLOWED_EMAILS` whitelist           |
| UI             | Tailwind CSS v3 + shadcn/ui (new-york, neutral)      |
| Charts         | Recharts                                            |

## First-time setup

```bash
cd finance-app
npm install                      # also runs `prisma generate` via postinstall

# 1. Configure environment
cp .env.example .env             # then edit .env (see "Environment variables")
npx auth secret                  # writes a real AUTH_SECRET into .env

# 2. Apply the schema to your Supabase database
npm run db:push                  # or `npm run db:migrate` for migration history

# 3. (optional) Seed default categories for a test user
npm run db:seed

# 4. Run it
npm run dev                      # http://localhost:3000  -> redirects to /login
```

### Google OAuth

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. Authorized redirect URI (dev): `http://localhost:3000/api/auth/callback/google`
   (add your production URL too when you deploy).
3. Put the client id/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
4. Add the emails allowed to sign in to `ALLOWED_EMAILS` (comma-separated).

## Environment variables

All live in `.env` (gitignored). `.env.example` is the committed template.

| Variable             | What it is                                                              |
| -------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`       | Supabase **pooled** connection (PgBouncer, port 6543) — runtime queries |
| `DIRECT_URL`         | Supabase **direct** connection (port 5432) — Prisma migrations/`db push` |
| `AUTH_SECRET`        | Session/JWT signing secret — generate with `npx auth secret`           |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                                                  |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                                             |
| `ALLOWED_EMAILS`     | Comma-separated whitelist, e.g. `you@x.com,friend@y.com`               |

Find both Supabase URLs in: Supabase → Project Settings → Database → Connection string.

## Scripts

| Command              | Does                                             |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start the dev server                             |
| `npm run build`      | Production build (also typechecks + lints)       |
| `npm run start`      | Serve the production build                       |
| `npm run lint`       | ESLint                                           |
| `npm run db:push`    | Push schema to the DB (no migration files)       |
| `npm run db:migrate` | Create + apply a dev migration                   |
| `npm run db:seed`    | Run `prisma/seed.ts` (default categories)        |
| `npm run db:studio`  | Open Prisma Studio (browse/edit data)            |
| `npm run db:generate`| Regenerate the Prisma client                     |

## Project structure

- `prisma/` — `schema.prisma` (data model, see below) and `seed.ts` (idempotent default categories).
- `src/auth.config.ts` / `src/auth.ts` / `src/middleware.ts` — split Auth.js config, full instance, and route protection.
- `src/app/(app)/` — authenticated app (dashboard, transactions, categories, accounts, import); each feature has its `actions.ts` alongside.
- `src/lib/` — Prisma client, shared helpers, validators, and constants.

For architecture and the conventions to follow when extending the app, see `CLAUDE.md`.

## Data model

Five app models, all carrying a `userId` FK for **per-user data isolation** —
always scope queries by the signed-in user's id (`session.user.id`).

- **User** — Auth.js-compatible (`id`, `email` unique, `name`, `emailVerified`, `image`, `createdAt`).
- **FinancialAccount** — `name`, `type` (`CHECKING|SAVINGS|CREDIT|CASH`), `balance` (Decimal), `currency` (default `EUR`).
- **Category** — `name`, `color`, `icon`, `isDefault`. Unique per `(userId, name)`.
- **Transaction** — `amount` (Decimal, stored positive), `type` (`INCOME|EXPENSE|TRANSFER`), `description`, `date`, `importSource` (default `manual`), nullable `accountId`/`categoryId`.
- **Budget** — `limitAmount` (Decimal), `period` (`MONTHLY|YEARLY`), `startDate`, nullable `endDate`.

Auth.js also adds `Account`, `Session`, `VerificationToken` (required by the adapter).

## Architecture notes / gotchas (read before extending)

These are intentional decisions — don't "fix" them without understanding why.

1. **`FinancialAccount`, not `Account`.** The Auth.js Prisma adapter *requires* a
   model literally named `Account` (OAuth provider links). The financial-account
   model is therefore `FinancialAccount` (table `financial_accounts`).
   `Transaction.accountId` → `FinancialAccount`.

2. **Prisma is pinned to v6.** Prisma 7 defaults to a new generator (client emitted
   to `src/generated/`) + `prisma.config.ts` datasource resolution, which diverges
   from current Auth.js/Supabase docs. v6 keeps standard `@prisma/client` imports
   and `package.json#prisma.seed`. If you upgrade to v7 later, expect to migrate the
   generator output path, imports, and seed config.

3. **Split Auth config + JWT sessions.** Middleware runs on the Edge runtime where
   the Prisma adapter can't run. So `auth.config.ts` is Prisma-free and used by
   `middleware.ts`; `auth.ts` spreads it and adds the adapter. Sessions are **JWT**
   (not database) so the whitelist is enforceable in middleware. The whitelist is
   checked in *both* the `signIn` callback and the middleware.
   - The `next build` warnings about `jose` / `CompressionStream` in the Edge
     Runtime are benign (Auth.js doesn't use JWE compression).

4. **shadcn/ui was set up manually** (the current CLI is Tailwind-v4-first and this is
   Tailwind v3.4). To add components, prefer `npx shadcn@2 add <component>`; if the
   CLI errors, copy the component source from ui.shadcn.com into `src/components/ui/`.

5. **Dependency majors to watch:** `recharts@3` and `lucide-react@1` are newer than
   most tutorials assume — APIs may differ from older examples.

## Roadmap

Build history and planned work are tracked in `finance-app-roadmap.md`.
