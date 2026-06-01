# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HECH is an Eye Hospital Eye Care Pharmacy Management System — a Next.js 14 (App Router) web application for managing pharmacy billing, drug inventory, purchasing, and regulatory compliance.

## Development Workflow

All development and testing must be done locally. Never deploy or push to the live/production environment without explicit user approval.

## Support Ticket Workflow (mandatory — follow every time)

**Whenever support tickets are mentioned or reviewed, follow this exact sequence:**

### Step 1 — Read from LIVE
Always query the production database for ticket state. Never rely on the local DB as the source of truth for tickets.
```bash
# Use PROD_DATABASE_URL from .env.local (the Neon connection string)
psql "$PROD_DATABASE_URL" -c "
  SELECT ticket_no, title, severity, status, reporter_name, created_at::date
  FROM support_tickets
  WHERE status NOT IN ('resolved', 'closed')
  ORDER BY created_at;
"
```

### Step 2 — Analyse
- Read the full ticket: description, steps to reproduce, expected vs actual behaviour, page URL, admin notes.
- Trace the issue through the codebase (API route → DB query → UI component).
- Identify the root cause before touching any code.

### Step 3 — Fix locally
- Make all code changes against the local codebase.
- Run `npm run dev` (or `npm run build` + `npx tsc --noEmit`) to verify no regressions.
- Test the specific scenario described in the ticket against the local dev server.

### Step 4 — Update ticket on LIVE (status → in_progress + admin notes)
Write investigation findings to the production DB immediately after root cause is confirmed — before the fix is pushed, so reporters can see progress.
```bash
psql "$PROD_DATABASE_URL" -c "
  UPDATE support_tickets
  SET status = 'in_progress',
      admin_notes = '<root cause + fix plan>',
      updated_at = NOW()
  WHERE ticket_no = 'TKT-XXXX';
"
```

### Step 5 — Get confirmation to push
Show the user a summary of:
- What was found (root cause)
- What was changed (files + lines)
- What was tested
Then ask: **"Confirmed — push to live?"**

### Step 6 — Push code to live
```bash
git fetch origin
npm run build && npx tsc --noEmit   # must be clean
git add <changed files>
git commit -m "fix: <description> (fixes TKT-XXXX)"
git push origin main                 # triggers Vercel auto-deploy (~45s)
```

### Step 7 — Update ticket on LIVE (status → resolved/awaiting_user + resolution)
After push, write the resolution to the production DB. Use `resolution` (reporter-visible) and `admin_notes` (internal).
```bash
psql "$PROD_DATABASE_URL" -c "
  UPDATE support_tickets
  SET status      = 'resolved',          -- or 'awaiting_user' if clarification needed
      resolution  = '<what was fixed, visible to reporter>',
      admin_notes = '<internal root cause notes>',
      resolved_at = NOW(),
      resolved_by = 'Claude (AI assistant)',
      updated_at  = NOW()
  WHERE ticket_no = 'TKT-XXXX';
"
```

### Key rules
- **`admin_notes` = internal only** — never shown to the reporter. Use for root cause, file names, line numbers.
- **`resolution` = reporter-visible** — use for what was fixed and any clarification questions the reporter needs to answer.
- **Never mark `resolved` without a `resolution` message** the reporter can read.
- **Clarification questions go in `resolution`**, not `admin_notes`, so the reporter can see them. Set status to `awaiting_user`.
- **Data changes (ticket status updates) must be applied to `PROD_DATABASE_URL`** — git push only carries code and schema migrations, not row-level data.

## Database — Two Environments

| | Local dev | Production |
|---|---|---|
| Host | `localhost:5432` | Neon (`*.neon.tech`) |
| Variable | `DATABASE_URL` in `.env.local` | `PROD_DATABASE_URL` in `.env.local` |
| Used for | Development & testing | Live app data, ticket management |

Add both to `.env.local`:
```bash
DATABASE_URL="postgresql://pharmacy_user:StrongPassword123@localhost:5432/pharmacy_db"
PROD_DATABASE_URL="postgres://<user>:<pass>@<host>.neon.tech/neondb?sslmode=require"
```
Get `PROD_DATABASE_URL` from Vercel → project → Settings → Environment Variables.

## Collaboration & Git Hygiene

**This is a shared repository with more than one developer.** As of this milestone, a second co-developer (`charidevops`) contributes alongside the owner (`vinit2776`). Both may push to `main`, so the remote can move between your sessions.

**ALWAYS sync with the remote BEFORE starting any local work or push.** Skipping this causes divergent branches, failed pushes, and merge conflicts. Run this at the start of every session and again before every push:

```bash
git fetch origin
git status                         # confirm where you are vs origin/main
git log --oneline HEAD..origin/main   # show any incoming commits you don't have
```

If `origin/main` is ahead of you, integrate before doing anything else:

```bash
git stash            # if you have uncommitted local work
git pull --ff-only origin main   # or: git rebase origin/main
git stash pop        # restore your work on top of the latest
```

Rules:
- **Never `git push` without a fresh `git fetch` first.** If the push is rejected as non-fast-forward, STOP — pull/rebase, re-verify the build, then push. Never force-push `main`.
- **Never `git reset --hard` while uncommitted work exists** — stash it first. Other developers' commits and your own WIP are both easy to destroy.
- **Run `npm run build` and `npx tsc --noEmit` locally before every push.** A red build on `main` blocks the Vercel deploy for everyone (this has already happened once — a `prisma/seed-demo.ts` JSON-null type error broke the deploy). CI on PRs (`.github/workflows/ci.yml`) is the safety net, but check locally first.
- **Prefer feature branches + PRs** over pushing straight to `main` for non-trivial work, so CI runs and the other developer can review.

## CI / CD Pipeline

- **CI** = `.github/workflows/ci.yml` — runs lint + typecheck + build on every PR and push. Uses self-contained dummy env vars; needs **no GitHub Secrets**.
- **CD** = **Vercel GitHub App integration** — auto-deploys every push to `main` within ~45s. There is **no** GitHub Actions deploy workflow, no `VERCEL_TOKEN`, no `.vercel/` directory in the repo, and no deployment secrets in GitHub. Real env vars (`DATABASE_URL`, `AUTH_SECRET`, etc.) live only in the Vercel project dashboard.
- **Do not** add a `deploy.yml`, run `npx vercel link`, or duplicate deploy secrets into GitHub. Deployment is already fully automatic via the Vercel GitHub App.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm start         # Run production server
npm run lint      # Run ESLint
npm run seed      # Seed database with initial data
```

Database migrations (Prisma):
```bash
npx prisma migrate dev --name <description>   # Create and apply migration
npx prisma migrate deploy                      # Apply migrations (production)
npx prisma studio                              # Open DB browser
npx prisma generate                            # Regenerate client after schema change
```

## Architecture

### App Router Structure

`src/app/` uses Next.js 14 App Router with two route groups:
- `(auth)/` — Public login page
- `(dashboard)/` — Protected routes (billing, drugs, inventory, purchasing, patients, doctors, registers)
- `api/` — REST API routes mirroring the dashboard sections

### Database & ORM

Prisma 7 with **Neon serverless PostgreSQL** using a TCP adapter (not WebSocket). The Prisma client singleton is in `src/lib/prisma.ts`. Domain queries are organized under `src/lib/db/` (billing, inventory, audit, registers). Schema is in `prisma/schema.prisma` (651 lines).

Key models: `User`, `Drug`, `InventoryBatch`, `PurchaseGrn`, `SalesBill`, `SalesReturn`, `PurchaseReturn`, `Patient`, `Doctor`, `RegisterForm17/18`, `AuditLog`, `Report`.

### Authentication & Authorization

NextAuth v5 (beta) with Credentials provider (email + bcrypt password). Two auth configs:
- `src/lib/auth.ts` — Full Node.js config with DB access
- `src/lib/auth.config.ts` — Edge-compatible config used by middleware

Role hierarchy: `counter_pharmacist`, `purchase_pharmacist`, `manager`, `super_admin`. Route protection via `src/middleware.ts` (Edge Runtime) and the `RoleGate` component. API routes use `withRole()` helper from `src/lib/auth-utils.ts`.

### State Management

Zustand stores in `src/store/`:
- `billingStore.ts` — Shopping cart state for billing workflow
- `grnStore.ts` — Goods Receipt Note form state

### Form Validation

Zod schemas in `src/lib/validations/` (bill, drug, grn, patient, ticket) paired with React Hook Form.

### Reporting System

`src/lib/reports/` contains a custom reporting engine:
- `engine.ts` — Executes report queries
- `registry.ts` — Report definitions
- `scheduler.ts` — Cron jobs for automated alerts (low stock, near-expiry) via `node-cron`, initialized in `src/instrumentation.ts`
- `renderers/` — Multi-format export: PDF (`@react-pdf/renderer`), Excel (`ExcelJS`), CSV

### UI Components

`src/components/ui/` — shadcn/ui components (Radix UI primitives + Tailwind CSS). `components.json` configures shadcn. Notifications via Sonner. Barcodes via `@zxing/library`.

### Path Alias

`@/` maps to `src/` (configured in `tsconfig.json`).

## Key Domain Concepts

- **GRN** — Goods Receipt Note (purchase order delivery record)
- **InventoryBatch** — Drug batches with expiry tracking and quarantine status
- **Form17/Form18** — Regulatory compliance registers required by pharmacy law
- **BPL patients** — Below Poverty Line patients who receive discounts (configured per drug in `DrugDiscountConfig`)
- **Drug schedules** — H, H1, X, G, etc. affect handling/reporting requirements
