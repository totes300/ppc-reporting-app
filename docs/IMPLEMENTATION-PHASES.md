# ReportKit — Implementációs fázisterv

## Kontextus

A PRD (`docs/REPORTKIT-PRD.md`) egy ügynökségi riportkészítő MVP-t ír le: Windsor.ai-ból adatot húz, Claude AI-val magyar elemzést generál, szerkeszthető, PDF-be exportálható. A jelenlegi kódbázis egy Next.js 16 + shadcn/ui dashboard starter — demo komponensekkel, backend nélkül. Ez a terv 6 fázisra bontja az implementációt.

## Architektúrális döntés: route group

A `(dashboard)` route group megmarad — a sidebar layout minden oldalon kell. A route-ok:
- `app/(dashboard)/page.tsx` → `/` (havi dashboard)
- `app/(dashboard)/clients/[id]/page.tsx` → `/clients/[id]`
- `app/(dashboard)/clients/[id]/reports/[reportId]/page.tsx` → `/clients/[id]/reports/[reportId]`
- `app/(dashboard)/settings/page.tsx` → `/settings`
- `app/api/reports/*` → API route-ok (sidebar nélkül)

---

## Fázis 1: Supabase alap + Auth ✅

**Cél:** DB séma, autentikáció, Supabase kliens, TypeScript típusok.

**Új fájlok:**
- `supabase/migrations/001_initial_schema.sql` — teljes séma (PRD 8. fejezet)
- `supabase/seed.sql` — Google Ads platform + glossary + agency_settings
- `lib/supabase/client.ts` — `createBrowserClient()` (`@supabase/ssr`)
- `lib/supabase/server.ts` — `createServerSupabaseClient()` (`@supabase/ssr`, async cookies)
- `lib/supabase/types.ts` — kézi TypeScript típusok a sémából
- `app/(auth)/login/page.tsx` — email+jelszó login
- `app/(auth)/layout.tsx` — auth layout (sidebar nélkül, centered)
- `proxy.ts` — auth session refresh + redirect (Next.js 16: `middleware.ts` → `proxy.ts`)

**Új csomagok:** `@supabase/supabase-js`, `@supabase/ssr`

**Módosítások:** `package.json`, `app/layout.tsx` (lang → "hu")

**Tesztelhető:** Migration lefut, seed data megjelenik Supabase Studio-ban, login működik, védett route-ok redirectelnek.

---

## Fázis 2: Navigáció + Ügyfélkezelés + Beállítások ✅

**Cél:** Demo komponensek lecserélése, valós sidebar, kliens CRUD, settings oldal.

**Új fájlok:**
- `lib/utils/format.ts` — magyar szám/dátum/pénznem formázás
- `lib/utils/dates.ts` — hónap számítás segédfüggvények
- `lib/queries/agency.ts`, `clients.ts`, `dashboard.ts`, `platforms.ts` — adatlekérdezések
- `lib/actions/clients.ts`, `settings.ts` — server action-ök
- `components/dashboard/month-selector.tsx`, `progress-bar.tsx`, `client-status-table.tsx`, `new-client-dialog.tsx`
- `components/clients/client-form.tsx`, `platform-connection-card.tsx`, `report-history-table.tsx`
- `components/settings/settings-form.tsx`
- `app/(dashboard)/clients/[id]/page.tsx`
- `app/(dashboard)/settings/page.tsx`

**Módosítások:**
- `app-sidebar.tsx` — valós nav (Irányítópult, Beállítások), ügynökség név DB-ből, props
- `nav-main.tsx` — egyszerűsítve, active state, Link komponens
- `nav-user.tsx` — email props-ból, Kijelentkezés gomb
- `site-header.tsx` — dinamikus page title usePathname()-ből
- `app/(dashboard)/layout.tsx` — fetch agency settings + user, props → sidebar
- `app/(dashboard)/page.tsx` — MonthSelector + ProgressBar + ClientStatusTable + NewClientDialog

**Törölt demo fájlok:** `chart-area-interactive.tsx`, `section-cards.tsx`, `data-table.tsx`, `nav-documents.tsx`, `nav-secondary.tsx`, `data.json`

**Tesztelhető:** Sidebar valós linkek, hónapválasztó (default: 2026. március), kliens létrehozás, Google Ads connection hozzáadás, settings mentés, logó feltöltés.

---

## Fázis 3: Windsor.ai integráció + adatlekérés ✅

**Cél:** Google Ads adatok behúzása Windsor.ai-ból, `period_metrics`-be mentés.

**Új fájlok:**
- `lib/windsor/fetch-platform-data.ts` — generikus Windsor fetch (PRD 10. fejezet)
- `lib/platforms/adapters/default.ts` + `google-ads.ts` — adapter pattern
- `lib/platforms/get-platform-config.ts`
- `lib/reports/upsert-period-metrics.ts`
- `lib/reports/build-report-payload.ts` — delta payload összeállítás
- `lib/reports/get-delta-presentation.ts` — delta számítás (PRD 11. fejezet)
- `app/api/reports/generate/route.ts` — POST: adat fetch + metrics upsert + report shell létrehozás (AI szöveg nélkül)
- `components/reports/monthly-generate-dialog.tsx` — generálás modal 3 lépéses progressel
- `components/reports/generation-progress.tsx`

**Tesztelhető:** Valós Windsor API kulccsal adat jön, `period_metrics`-ben megjelenik, report sor létrejön `draft` státuszban, dashboard "Piszkozat"-ot mutat.

---

## Fázis 4: Claude AI integráció + riport generálás teljesítése ✅

**Cél:** AI szöveggenerálás → teljes riport pipeline.

**Új fájlok:**
- `lib/ai/generate-analysis.ts` — platform elemzés prompt + Claude API hívás
- `lib/ai/generate-summary.ts` — vezetői összefoglaló prompt + Claude API hívás
- `app/api/reports/regenerate/route.ts` — teljes újragenerálás
- `app/api/reports/sections/regenerate/route.ts` — szekció újragenerálás

**Új csomag:** `@anthropic-ai/sdk`

**Módosítások:** `app/api/reports/generate/route.ts` — AI generálás hozzáadása a 2. lépésben

**Tesztelhető:** Generálás után `report_sections.ai_generated_text` kitöltve, magyar szöveg, valós metrikákat referál. Újragenerálás működik. Hibakezelés Claude API hiba esetén.

---

## Fázis 5: Riport szerkesztő ✅

**Cél:** A központi szerkesztő felület: metrika táblák, szövegszerkesztés, autosave, szekció kezelés.

**Új fájlok:**
- `app/(dashboard)/clients/[id]/reports/[reportId]/page.tsx`
- `components/reports/report-editor.tsx` — fejléc + szekciók layout
- `components/reports/account-metrics-table.tsx` — fiókszintű mutatók delta színekkel
- `components/reports/campaign-table.tsx` — top 10 kampány, 3 sor/kampány
- `components/reports/section-card.tsx` — szekció wrapper enable/disable switch-csel
- `components/reports/text-editor.tsx` — textarea + 2s autosave + újragenerálás gomb
- `components/reports/custom-report-dialog.tsx` — egyedi riport dátumválasztó
- `hooks/use-autosave.ts` — 2s debounce

**Új csomag:** `use-debounce`

**Tesztelhető:** Editor betölt, metrika táblák csoportosítva + delta színekkel, textarea autosave működik (2s), szekció ki/bekapcsolás, újragenerálás megerősítő dialóggal, egyedi riport létrehozás dátumvalidációval.

---

## Fázis 6: PDF export + befejezés ⬜

**Cél:** On-demand PDF generálás, státusz lezárás → teljes MVP.

**Új fájlok:**
- `components/pdf/report-pdf.tsx` — root PDF document (landscape)
- `components/pdf/pdf-cover.tsx` — borító
- `components/pdf/pdf-metrics-table.tsx` — fiókszintű táblázat
- `components/pdf/pdf-campaign-table.tsx` — kampánytáblázat
- `components/pdf/pdf-text-section.tsx` — szöveges szekció
- `components/pdf/pdf-glossary.tsx` — szószedet
- `components/pdf/pdf-styles.ts` — közös stílusok
- `app/api/reports/pdf/route.ts` — GET: PDF renderelés + stream + status → completed
- `lib/pdf/register-fonts.ts` — font regisztráció

**Új csomag:** `@react-pdf/renderer`

**Tesztelhető:** PDF letöltés landscape formátumban, csak enabled szekciók, szerkesztett szöveg prioritás, borító logókkal, glossary. Letöltés után status = `completed`. Újraszerkesztés után visszamegy `draft`-ba.

**End-to-end teszt:** Kliens létrehozás → connection → generálás → szerkesztés → PDF letöltés → status = Kész.

---

## Függőségek

```
Fázis 1 (Supabase + Auth)
  ↓
Fázis 2 (Navigáció + Kliens CRUD + Settings)
  ↓
Fázis 3 (Windsor.ai + Adatlekérés)
  ↓
Fázis 4 (Claude AI + Generálás)
  ↓
Fázis 5 (Riport szerkesztő)
  ↓
Fázis 6 (PDF export)
```

## Új csomagok összesítve

| Fázis | Csomag | Cél |
|-------|--------|-----|
| 1 | `@supabase/supabase-js`, `@supabase/ssr` | DB + Auth |
| 4 | `@anthropic-ai/sdk` | Claude AI |
| 5 | `use-debounce` | Autosave |
| 6 | `@react-pdf/renderer` | PDF |

## Verifikáció

Minden fázis végén:
1. `npm run build` hiba nélkül lefut
2. `npm run lint` hiba nélkül lefut
3. Az adott fázis tesztelhető eredménye kézzel ellenőrizhető a böngészőben
4. Commitolható állapot
