# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npx shadcn add <component>` — add shadcn/ui components

## Architecture

**PPC Agency Report** (ReportKit) — an agency reporting tool that pulls ad platform data via Windsor.ai API, generates Hungarian-language analysis with Claude AI, and exports to PDF. Currently MVP stage, Google Ads-first but multi-platform-ready.

### Stack
- **Next.js 16** (React 19, App Router) with TypeScript
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **shadcn/ui v4** (Radix primitives, CVA, tailwind-merge, cmdk)
- **Recharts** for charts, **@tanstack/react-table** for data tables, **@dnd-kit** for drag-and-drop
- **Zod v4** for validation

### Route structure
- `app/layout.tsx` — root layout (fonts: Geist Sans, Geist Mono, Nunito Sans for headings)
- `app/(dashboard)/` — main dashboard route group with sidebar layout
  - `layout.tsx` — wraps pages in `SidebarProvider` + `AppSidebar` + `SiteHeader`
  - `page.tsx` — dashboard home: MonthSelector, ProgressBar, ClientStatusTable, NewClientDialog
  - `clients/[id]/page.tsx` — client detail: ClientForm, PlatformConnectionCard, ReportHistoryTable
  - `clients/[id]/reports/[reportId]/page.tsx` — report page (placeholder, Phase 5)
  - `settings/page.tsx` — agency settings
- `app/api/reports/generate/` — POST: Windsor.ai fetch + metrics upsert + report creation
- `app/(auth)/login/` — email+password login

### Key directories
- `components/` — app-level components (sidebar, site-header, nav-*)
- `components/ui/` — shadcn/ui primitives
- `components/dashboard/` — dashboard-specific (month-selector, progress-bar, client-status-table, new-client-dialog)
- `components/clients/` — client detail (client-form, platform-connection-card, report-history-table)
- `components/reports/` — report generation dialogs + progress
- `components/settings/` — settings form
- `hooks/` — custom hooks (e.g., `use-mobile.ts`)
- `lib/utils.ts` — utility functions (cn helper)
- `lib/windsor/` — Windsor.ai API integration
- `lib/platforms/adapters/` — platform-specific data normalization (default, google-ads)
- `lib/reports/` — report utilities (delta presentation, metrics upsert, payload builder)
- `lib/queries/` — Supabase read queries
- `lib/actions/` — server actions (clients, settings)
- `lib/supabase/` — Supabase client setup + types
- `docs/REPORTKIT-PRD.md` — full PRD in Hungarian

### Styling
- Path alias: `@/*` maps to project root
- Custom font variable: `--font-heading` (Nunito Sans) for headings
- CSS uses Tailwind v4 syntax (`@import "tailwindcss"`, `@theme inline`, `@custom-variant`)
- Dark mode via `dark` custom variant class strategy

### UI development rules
- **Always use shadcn/ui components** as the building blocks. Do not create custom UI primitives when a shadcn component exists. Follow shadcn patterns (CVA variants, `cn()` merging, Radix composition with `asChild`, `data-slot` attributes).
- When adding new UI components, use `npx shadcn add <component>` — do not copy-paste or hand-roll equivalents.
- Use the **shadcn skill** (`/shadcn`) whenever you need fresh shadcn docs, usage examples, or component APIs.

### Staying up-to-date
- For **any external library, integration, or API** where training data may be outdated, use the **Context7 MCP** (`resolve-library-id` then `query-docs`) to fetch the latest documentation before writing code.
- For **Next.js 16** specifically, also check `node_modules/next/dist/docs/` — this version has breaking changes.

### Debugging és hibajavítás

1. **Diagnosztizálj mielőtt javítanál.** Ha egy érték rossz típusú, ne cast-olj/parseolj a fogyasztó oldalon — keresd meg, HONNAN jön a rossz érték (DB schema, API response, serialization boundary). Használj közvetlen lekérdezést (curl, node -e, SQL) az adat valódi alakjának ellenőrzésére.
2. **Javítsd a forrást, ne a fogyasztót.** Ha a DB rossz típust ad vissza → migráció. Ha az API rossz shape-et küld → az API-t javítsd. Defenzív parse/cast a fogyasztó oldalon csak ideiglenes bridge lehet, soha nem a végleges megoldás.
3. **Ne írj kódot amíg nem érted a hibát.** Egy wrapper 6 helyre szórva azt jelenti, hogy nem értetted meg miért rossz az adat — csak elfedted. Előbb értsd meg, aztán javíts egyetlen helyen.

### Important notes
- The PRD and UI copy are in **Hungarian** — maintain this language in user-facing text
