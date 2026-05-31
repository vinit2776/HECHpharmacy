# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HECH is an Eye Hospital Eye Care Pharmacy Management System — a Next.js 14 (App Router) web application for managing pharmacy billing, drug inventory, purchasing, and regulatory compliance.

## Development Workflow

All development and testing must be done locally. Never deploy or push to the live/production environment without explicit user approval.

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
