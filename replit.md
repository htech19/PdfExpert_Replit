# PdfExpert v8

Professional SaaS for automated PDF processing, OCR text extraction, AI product name correction, and e-commerce catalog export.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/pdf-expert run dev` — run the frontend (port 25931)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk Auth (`@clerk/express`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle, pdfjs-dist externalized)
- Frontend: React + Vite, Tailwind v4, Clerk React (`@clerk/react`)

## Where things live

- `artifacts/api-server/` — Express API server
- `artifacts/pdf-expert/` — React+Vite frontend
- `lib/db/` — PostgreSQL schema (Drizzle ORM)
- `lib/api-spec/` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/` — generated React Query hooks + Zod schemas
- `artifacts/api-server/src/lib/pdf-extractor.ts` — pdfjs-dist OCR extraction
- `artifacts/api-server/src/lib/ai-corrector.ts` — OpenAI batch name correction (with local fallback)
- `artifacts/api-server/src/lib/exporter.ts` — CSV/JSON/XLSX/Shopify/WooCommerce export
- `artifacts/api-server/src/lib/processor.ts` — main processing pipeline
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` — Clerk proxy for prod

## Architecture decisions

- pdfjs-dist is externalized from esbuild bundle to avoid DOMMatrix/canvas issues in Node.js; loaded via dynamic import at runtime with manual globalThis polyfills
- OpenAI correction falls back to local string normalization if `OPENAI_API_KEY` is not set — no crash
- Exports are generated in-memory on each download request (no disk storage needed)
- Clerk Auth uses cookie-based session for web; `clerkMiddleware` mounted before routes in app.ts
- `simulateProcessing` kept as alias to `processJob` for backward compatibility

## Product

- **Upload PDF** → real OCR with pdfjs-dist, page-by-page text extraction
- **AI Name Correction** → OpenAI GPT-4o-mini normalizes raw catalog codes to clean Portuguese product names
- **Catalog** → browse extracted products with brand/category/material/color
- **Export Center** → download as CSV, JSON, XLSX, Shopify import, WooCommerce import
- **Auth** → Clerk Auth (Google + email/password), dark theme, branded login

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **pdfjs-dist must be externalized in esbuild** (`artifacts/api-server/build.mjs`) — bundling it causes `DOMMatrix is not defined` crash at startup
- **`@clerk/react` (not `@clerk/clerk-react`)** is the correct package name for the frontend
- `pnpm run typecheck:libs` must pass before artifact typechecks — run it first when debugging type errors
- Generated React Query hooks use `UseQueryOptions` which requires `queryKey`; pass `as any` when only `refetchInterval` is needed
- Tailwind v4 with Clerk requires `@layer theme, base, clerk, components, utilities;` before `@import 'tailwindcss'` in index.css, and `tailwindcss({ optimize: false })` in vite.config.ts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
