# Tayyaba Palace

Booking and invoicing system for a marriage hall, with PRA fiscal
integration and USB thermal printing. Single-tenant, runs on one Windows
laptop at the venue.

## Docs

- **[doc/WINDOWS_SETUP.md](doc/WINDOWS_SETUP.md)** — start here to get this
  running on the venue laptop: install steps, verifying the PRA fiscal
  device and printer are actually connected, what to fill in before your
  first test, and the sandbox test plan.
- [doc/FLOW.md](doc/FLOW.md) — screen-by-screen UX behaviour.
- [doc/TECHNICAL_SPEC.md](doc/TECHNICAL_SPEC.md) — architecture, schema, API.
- [doc/PRA_INTEGRATION.md](doc/PRA_INTEGRATION.md) — everything about the
  PRA fiscal device integration.

## Local development (macOS/Linux)

Fiscal device and printer aren't available outside Windows, so local dev
uses a `MockAdapter` for fiscalisation (always succeeds) and logs receipts
to the console instead of a real printer.

```bash
pnpm install
cd apps/server && cp .env.example .env   # FISCAL_ADAPTER=mock by default
pnpm db:migrate && pnpm db:seed
cd ../..
pnpm dev:server   # terminal 1
pnpm dev:web      # terminal 2
```

Open `http://localhost:5173`. Login: whatever `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` you set in `.env` (defaults to
`admin@tayyabapalace.com` / `change-me`).

## Project layout

```
apps/
  server/   Fastify + SQLite (better-sqlite3 + Drizzle) API
  web/      React + Vite + Tailwind frontend
packages/
  shared/   zod schemas shared between server and web
```
