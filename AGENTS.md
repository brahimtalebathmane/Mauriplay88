# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

MauriPlay is a digital marketplace PWA for selling digital gaming products (game codes, gift cards). It is a single React 18 + TypeScript + Vite frontend app that uses Supabase as its Backend-as-a-Service. The UI is Arabic (RTL) with a dark monochrome theme.

### Running the Application

- **Dev server:** `npm run dev` (Vite on `http://localhost:5173`)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint; has many pre-existing `no-explicit-any` and unused-var warnings/errors)
- **Type check:** `npm run typecheck` (has pre-existing unused import errors in `App.tsx`, `AccountRecovery.tsx`, `Platform.tsx`)
- **No automated test suite** (no jest/vitest configured); testing is manual per `TESTING_GUIDE.md`

### Environment Variables

A `.env` file at the repo root is required with:
```
VITE_SUPABASE_URL=<supabase project URL>
VITE_SUPABASE_ANON_KEY=<supabase anonymous key>
```
These are injected as secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The `.env` file must be created from these secrets on each session since it is gitignored.

### Database Schema Notes

The Supabase database has been manually modified and may not match the local migration files in `supabase/migrations/`. The owner has provided the authoritative schema:

- **`platforms`** table: columns are `id` (UUID), `name` (TEXT), `logo_url` (TEXT — not `product_logo_url`), `is_deleted` (BOOLEAN), `created_at` (TIMESTAMPTZ)
- **`users`** table: columns are `id` (UUID, references `auth.users`), `email` (TEXT), `role` (TEXT, default `'user'`), `created_at` (TIMESTAMPTZ)
- RLS is enabled on `platforms` with admin full-access policy and public read for non-deleted rows

When making changes to API calls or admin pages, always verify column names against the actual Supabase schema rather than relying on local migration files.

### Key Gotchas

- The app uses custom phone+PIN authentication (not Supabase Auth email/password). Login calls `verify_user_login` RPC.
- Session is managed via Zustand with localStorage persistence (`mauriplay-storage` key), not Supabase session tokens.
- The home page (`/`) requires authentication; unauthenticated users are redirected to `/login`.
- The `package.json` uses npm (lockfile is `package-lock.json`).
- No Docker, no devcontainer, no Makefile — the only local process is the Vite dev server.
