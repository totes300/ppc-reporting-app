# ReportKit — Product Requirements Document (PRD)

> **Verzió:** v5 (MVP-simplified, implementation-ready)
> **Dátum:** 2026. április 2.
> **Státusz:** Kész fejlesztésre
> **Fejlesztő:** Egyedül fejlesztem, Claude Code segítségével
> **Irányelv:** Gyors, stabil, jól működő MVP. Nem cél a túltervezés.

---

## 1. Összefoglaló

### Mi ez?

Ügynökségi riportkészítő eszköz. A hirdetési platformokból a Windsor.ai API-n keresztül automatikusan behúzza az adatokat, Claude AI-val magyar nyelvű elemzést készít, a felhasználó szerkeszti egy strukturált felületen, majd PDF-be exportálja. A PDF-et kézzel csatolja emailhez és küldi el az ügyfélnek.

### Kinek szól?

Első körben saját ügynökségi belső használatra. Egyetlen felhasználó használja, aki havonta 30+ ügyfélnek készít riportot.

### Fő értékígéret

Ami ma ügyfelenként 30-60 perc manuális munka, az 3-5 percre csökken:

`Generálás -> átnézés -> szövegszerkesztés -> PDF letöltés`

### MVP cél

Az MVP első működő verziója:

- Google Ads adatokból tudjon havi riportot készíteni.
- Tudjon külön egyedi időszakos riportot is készíteni.
- A riport legyen élő, szerkeszthető, felülírható.
- A PDF mindig a legfrissebb állapotból készüljön.
- Ne építsen verziókezelő, approval vagy workflow rendszert.

---

## 2. Alapelvek

### Multi-platform-ready, de Google Ads-first MVP

Az architektúra készüljön fel több platformra, mert rövid távon Meta, GA4 és más Windsor.ai connectorok is jönni fognak. Ugyanakkor az MVP-ben kizárólag Google Ads kerül implementálásra.

Ez azt jelenti:

- a platformok metaadatai adatbázisban konfigurálhatók,
- a renderelés és adatfeldolgozás ahol olcsón lehet, legyen generikus,
- de nem követelmény, hogy minden jövőbeli platform 100%-ban csak DB sor hozzáadásával működjön,
- elfogadott egy vékony, platform-specifikus adapter réteg ott, ahol a Windsor mezőnevek vagy válaszok eltérnek.

Röviden: **config-driven rendszer + opcionális thin adapter**, nem dogmatikus "zero-code platform support".

### Havi workflow az elsődleges use case

A termék elsődleges belépési pontja a havi dashboard. Ez a nézet kizárólag a havi riport workflow-t szolgálja ki.

### Egyedi időszak támogatott, de másodlagos

Féléves, éves vagy bármilyen egyedi időszakos riport generálható, de ezek:

- nem jelennek meg a havi dashboard progress számolásában,
- nem keverednek a havi riport státuszlogikával,
- az ügyfél riport előzményei között jelennek meg.

### Élő riport, nincs befagyasztás

Az MVP-ben nincs immutable snapshot, nincs approval alapú lezárás, nincs verziókezelés.

Ehelyett:

- egy riport mindig az aktuális, legfrissebb állapotot reprezentálja,
- a szerkesztés autosave-vel mentődik,
- a teljes újragenerálás felülírja a riport számait és AI szövegeit,
- a PDF mindig az aktuális állapotból készül.

### Autosave, nincs manuális mentés

Minden szöveges szerkesztés automatikusan mentődik, 2 mp inaktivitás után. Nincs külön "Mentés" gomb.

### PDF on-demand, nem tárolt artifact

Az MVP-ben a PDF nem source of truth, és nem kötelező eltárolni Storage-ba. A `PDF letöltés` gomb minden alkalommal az aktuális riportállapotból generál új PDF-et.

### Manuális küldés

A felhasználó tölti le a PDF-et és kézzel küldi el emailben. Nincs appon belüli email küldés.

### Egyetlen felhasználó

Nincs multi-user, nincs invitation flow, nincs role management, nincs collaborative editing.

### Nem cél a túlfejlesztés

Az MVP-ben nem cél:

- teljes workflow engine,
- valós idejű részletes háttérfolyamat-kijelzés,
- PDF-verziótár,
- diagramok,
- automatizált küldés,
- cron alapú automatikus generálás.

---

## 3. Tech Stack

| Technológia | Szerep |
|---|---|
| **Next.js** (App Router) | UI + API routes |
| **Supabase** | PostgreSQL + Auth (email+jelszó) + Storage (logók) |
| **shadcn/ui + Tailwind CSS** | UI komponensek és styling |
| **Windsor.ai** | Egyetlen API több hirdetési platform adatforrásához |
| **Claude API** | Magyar nyelvű szöveges elemzések |
| **@react-pdf/renderer** | On-demand PDF generálás |

### Miért ezek?

**Supabase** — gyors backend indulás, auth és adatbázis egy helyen.

**Windsor.ai** — egy közös API-réteg több platform fölött. Ez jelentősen gyorsítja a bővítést Google Ads után.

**Claude API** — magyar nyelvű, ügyfélbarát összefoglalók és platform-elemzések.

**@react-pdf/renderer** — nincs külön PDF service és nincs Chromium/Puppeteer overhead.

### API kulcsok kezelése

Az MVP-ben a Windsor és Claude API kulcsok **nem** adatbázisból szerkeszthetők, hanem environment variable-ból jönnek.

Indok:

- egyszerűbb,
- biztonságosabb,
- egyfelhasználós belső appnál nincs szükség API key management UI-ra.

### Szükséges environment változók

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WINDSOR_API_KEY=
CLAUDE_API_KEY=
```

### shadcn/ui komponens mapping

| Képernyő | Komponensek |
|---|---|
| Globális | `Button`, `Badge`, `Skeleton`, `Sonner/Toast`, `AlertDialog` |
| Havi dashboard | `Table`, `Badge`, `Select`, `Button`, `Progress` |
| Ügyfél részletek | `Card`, `Avatar`, `Dialog`, `Select`, `Input`, `Table`, `Label`, `Button` |
| Havi riport generálás | `Dialog`, `Button`, `Progress`, `Badge` |
| Egyedi riport generálás | `Dialog`, `Popover`, `Calendar`, `Button`, `Progress`, `Badge` |
| Riport szerkesztő | `Table`, `Switch`, `Textarea`, `Separator`, `Button`, `Badge`, `AlertDialog` |
| Settings | `Input`, `Button`, `Label`, `Card` |

---

## 4. Ügyfél típusok

Két ügyféltípus létezik. Ez határozza meg a riport táblázatainak oszlopait és az AI hangnemét.

### Webshop

E-commerce ügyfelek, ahol a bevétel és a megtérülés a fő KPI.

**Fiókszintű mutatók:**

| Csoport | Mutatók |
|---|---|
| Forgalom | Kattintás, Megjelenés, Átl. CTR, CPC, Költés |
| Konverziók | Konverziók összesen, Konverzió/költség, Kosárérték, Bevétel, ROAS |
| Keresési pozíció | Átlag keresési megjelenítési arány, Felső megj. arány |

**Kampánytáblázat oszlopok:**

`Kampány | Kattintás | Megjelenés | CTR | CPC | Költés | Konverziók | Konv/költség | Kosárérték | Bevétel | ROAS`

### Szolgáltató

Lead generation ügyfelek, ahol a lead szám és a CPA a fő KPI.

**Fiókszintű mutatók:**

| Csoport | Mutatók |
|---|---|
| Forgalom | Kattintás, Megjelenés, Átl. CTR, CPC, Költés |
| Konverziók | Konverziók összesen, Konverzió/költség (CPA) |
| Keresési pozíció | Átlag keresési megjelenítési arány, Felső megj. arány |

**Kampánytáblázat oszlopok:**

`Kampány | Kattintás | Megjelenés | CTR | CPC | Költés | Konverziók | CPA`

### Különbségek összefoglalása

| | Webshop | Szolgáltató |
|---|---|---|
| **Extrák** | Kosárérték, Bevétel, ROAS | – |
| **KPI fókusz** | Bevétel, ROAS, kosárérték | Lead szám, CPA |
| **AI hangnem** | "A bevétel X%-kal nőtt..." | "Y db ajánlatkérés érkezett..." |

---

## 5. Kulcs döntések a riport lifecycle-ról

Ez a fejezet implementációs szempontból kritikus.

### 5.1 Havi riport

- Egy havi riport egy adott ügyfélre és egy adott naptári hónapra vonatkozik.
- Egy ügyfélhez egy hónapra pontosan egy havi riport létezhet.
- A havi dashboard kizárólag ezeket a riportokat kezeli.
- A havi dashboard default hónapja mindig az **előző teljesen lezárt hónap**.
  - Példa: 2026. április 2-án a default a **2026. március**.

### 5.2 Egyedi riport

- Egyedi riport tetszőleges időszakra készülhet.
- Példák: féléves, éves, kampányidőszak, év elejétől máig.
- Az egyedi riportok nem számítanak bele a havi dashboard progressbe.
- Az egyedi riportok az ügyfél riport előzményeiben jelennek meg.

### 5.3 Riport státuszmodell

Az MVP státuszmodellje egyszerű:

- `draft` = a riport létezik, de a legfrissebb állapot még nem lett PDF-ként sikeresen letöltve
- `completed` = a riport legfrissebb állapota már le lett töltve PDF-ként legalább egyszer

Fontos:

- a `completed` **nem** jelenti azt, hogy a riport zárolt,
- a `completed` **nem** jelent approval workflow-t,
- a `completed` csak UI státusz a dashboard és az előzmények számára.

### 5.4 Státuszátmenetek

| Esemény | Új státusz |
|---|---|
| Új riport generálása | `draft` |
| Teljes újragenerálás | `draft` |
| Szövegszerkesztés autosave-vel | `draft` |
| Szekció újragenerálása | `draft` |
| PDF sikeres letöltés | `completed` |

### 5.5 Teljes újragenerálás szabálya

Ha a felhasználó teljes újragenerálást indít:

- az aktuális és összehasonlítási számadatok felülíródnak,
- az AI szövegek újragenerálódnak,
- a kézzel szerkesztett szövegek törlődnek,
- a riport `draft` státuszba kerül.

Ha van már szerkesztett szöveg, kötelező megerősítő modal:

`A teljes újragenerálás felülírja a számadatokat és törli a kézi szövegszerkesztéseket. Folytatod?`

### 5.6 PDF viselkedése

- A PDF mindig az aktuális riportállapotból készül.
- Nem egy korábban mentett PDF-fájlt szolgálunk ki.
- Ha a riport megváltozott és újra letöltöd, az új PDF az új állapotot tartalmazza.

---

## 6. Felhasználói utak

### 6.1 Havi workflow

1. A felhasználó belép az appba.
2. A havi dashboard az előző lezárt hónapot mutatja.
3. A listában látja, mely ügyfelekhez van havi riport.
4. Ha egy ügyfélnél nincs riport, kattint: `Generálás`.
5. A riport legenerálódik.
6. Megnyílik a szerkesztő.
7. A felhasználó átnézi, átírja a szövegeket.
8. `PDF letöltés`.
9. A státusz `completed` lesz.
10. Ha később újra szerkeszt vagy újragenerál, a riport visszamegy `draft` státuszba.

### 6.2 Egyedi workflow

1. A felhasználó megnyitja az ügyfél részleteit.
2. Kattint: `Új egyedi riport`.
3. Beállítja az aktuális és összehasonlítási időszakot.
4. `Generálás`.
5. Megnyílik a szerkesztő.
6. A riport megjelenik az előzményekben, de a havi dashboard progressbe nem számít bele.

---

## 7. Képernyők és funkciók

### 7.1 Havi dashboard (főoldal)

Ez az app elsődleges belépési pontja.

#### Cél

Gyorsan végigmenni az adott hónap összes ügyfelén.

#### Tartalom

- Hónap választó a tetején
  - default: előző teljesen lezárt hónap
  - navigálható vissza és előre
- Progress: `12 / 32 kész`
  - csak a havi riportokat számolja
  - képlet: `completed havi riportok / aktív ügyfelek`
- Táblázat az összes aktív ügyfélről

#### Oszlopok

- ügyfél név
- típus (`webshop` / `szolgáltató`)
- összekötött platformok
- riport státusz az adott hónapra
  - `Nincs`
  - `Piszkozat`
  - `Kész`
- akció gomb

#### Akció gomb logika

- `Generálás` -> ha nincs havi riport az adott hónapra
- `Szerkesztés` -> ha már létezik havi riport

Nincs külön `Megnyitás` gomb, mert a `completed` riport is továbbra is szerkeszthető.

#### Fontos szabály

A dashboard **nem** listázza külön az egyedi riportokat, és azok státusza nem torzíthatja a havi progresset.

---

### 7.2 Ügyfél részletek

Három blokk van ezen az oldalon.

#### Ügyfél profil

- név
- típus
- iparág
- kontakt email
- belső megjegyzések
- logó feltöltés

#### Összekötött platformok

- kártyák az aktív kapcsolódásokról
- platform neve
- account név
- account ID
- utolsó sikeres szinkron ideje
- `Platform hozzáadása`
- `Platform eltávolítása`

MVP-ben csak Google Ads választható, de a UI készüljön fel több aktív platformra.

#### Riport előzmények

Az ügyfélhez tartozó összes korábbi riport:

- havi riportok
- egyedi riportok

#### Oszlopok

- riport típusa
  - `Havi`
  - `Egyedi`
- aktuális periódus
- összehasonlítási periódus
- státusz
- létrehozás dátuma
- utolsó PDF letöltés ideje

#### CTA-k

- `Új egyedi riport`
- sorra kattintva: riport megnyitása szerkesztőben

Az ügyfél részletek oldalról nincs szükség külön havi riport generálásra, mert azt a dashboard szolgálja ki.

---

### 7.3 Havi riport generálás

Ez a dashboardról indul.

#### UX cél

A havi riport generálása legyen gyors és egyértelmű. Ne kérjen fölösleges inputot.

#### Bemenet

A felhasználónak nem kell dátumot megadnia.

A rendszer fixen használja:

- aktuális periódus = a dashboardon kiválasztott naptári hónap
- összehasonlítás = az azt közvetlenül megelőző teljes naptári hónap

Példa:

- dashboard: 2026. március
- current: 2026-03-01 -> 2026-03-31
- comparison: 2026-02-01 -> 2026-02-28

#### Modal tartalom

- rövid összefoglaló a két időszakról
- `Generálás` gomb
- folyamat állapot visszajelzés

#### Progress feedback

Az MVP-ben **nem** kell request-szintű, per-platform, per-step valós idejű log.

Elég 3 magas szintű állapot:

1. `Adatok lehúzása`
2. `AI szövegek generálása`
3. `Riport frissítése`

Minden állapot:

- `várakozik`
- `folyamatban`
- `kész`
- `hiba`

Ez megadható pollinggal, nem kell websocket vagy streaming.

---

### 7.4 Egyedi riport generálás

Ez az ügyfél részletek oldalról indul.

#### Mezők

- aktuális periódus: `date from` + `date to`
- összehasonlítási periódus: `date from` + `date to`

#### Defaultok

- current default: előző teljes hónap
- comparison default: az azt megelőző, azonos hosszúságú időszak

#### Validáció

- minden kezdődátum <= záródátum
- a current és comparison időszak nem lehet üres
- a current és comparison időszak nem fedheti egymást

#### Egyedi riport deduplikáció

Ha ugyanarra az ügyfélre már létezik pontosan ugyanazzal a current + comparison dátumpárral egy egyedi riport, akkor:

- nem hozunk létre újat,
- a meglévő riportot nyitjuk meg / írjuk felül,
- a felhasználó ugyanazt a riportot szerkeszti tovább.

---

### 7.5 Riport szerkesztő

Ez a termék központi képernyője.

#### Fejléc

- vissza az ügyfél részletekre
- ügyfél neve
- riport típus badge
  - `Havi`
  - `Egyedi`
- periódus megjelenítés
- státusz badge
  - `Piszkozat`
  - `Kész`
- autosave státusz
  - `Mentve`
  - `Mentés...`
- `PDF letöltés`
- `Teljes újragenerálás`

Nincs `Jóváhagyás` gomb.

#### Szekciók sorrendje

##### A) Platform szekciók

A `client_connections` alapján dinamikusan jönnek létre.

MVP-ben ez jellemzően egy Google Ads szekció, de a szerkesztő több platformra legyen felkészítve.

Minden platform szekció tartalma:

1. **Fiókszintű mutatók táblázat**
   - oszlopok: `Mutató | Aktuális | Előző | Δ`
   - sorok a `platforms.fields_config.account_table[report.template_type]` alapján
   - csoportosítás a `group` mező alapján
   - színkód:
     - zöld = javulás
     - piros = romlás
     - semleges = nincs értelmezhető delta
   - `inverse: true` esetén fordított logika

2. **Kampányszintű bontás**
   - forrás: `period_metrics.extra_data.campaigns`
   - oszlopok: a `fields_config.campaign_table[report.template_type]`
   - maximum **top 10 kampány**
   - rendezés: current period spend szerint csökkenő sorrendben
   - minden kampányhoz három sor:
     - aktuális
     - előző
     - delta

3. **Szöveges elemzés**
   - AI generált szöveg
   - szerkeszthető textarea
   - `Újragenerálás` gomb

4. **Szekció kapcsoló**
   - be/ki
   - kikapcsolt szekció nem jelenik meg a PDF-ben

##### B) Vezetői összefoglaló

- a riport végén jelenik meg
- az összes aktív platformot figyelembe veszi
- ügyfélbarát nyelven íródik
- szerkeszthető
- külön újragenerálható

##### C) Szószedet

- statikus
- nem AI generálja
- globális glossary táblából jön
- be/ki kapcsolható

#### Szekció újragenerálás logika

Ha az adott szekció `edited_text` mezője nem null, újragenerálás előtt megerősítést kell kérni:

`Az újragenerálás törli az adott szekció kézi szerkesztését. Folytatod?`

Újrageneráláskor:

- `ai_generated_text` felülíródik
- `edited_text` null-ra áll
- riport státusz `draft`

---

### 7.6 Settings oldal

Az ügynökség globális, nem technikai beállításai.

#### Tartalom

- ügynökség neve
- ügynökség logó
- elsődleges branding szín

#### Nincs benne

- Windsor API kulcs
- Claude API kulcs

Ezek env-ből jönnek.

---

### 7.7 PDF export

#### Technikai elv

- szerver oldali, on-demand generálás
- `@react-pdf/renderer`
- a PDF nem tárolt forrás, hanem aktuális renderelt kimenet

#### Orientáció

Landscape

#### PDF felépítése

1. **Borító oldal**
   - ügyfél logó
   - ügynökség logó
   - ügyfél neve
   - riport típusa
   - periódus
   - ügynökség neve

2. **Platform szekciók**
   - fiókszintű mutatók
   - kampánytábla
   - szöveges elemzés

3. **Vezetői összefoglaló**

4. **Szószedet** (ha be van kapcsolva)

#### Fontos szabályok

- a PDF csak a bekapcsolt szekciókat tartalmazza
- a szerkesztett szöveg megelőzi az AI szöveget
- a PDF letöltés után a riport státusz `completed`

---

## 8. Adatmodell (Supabase séma)

```sql
-- ============================================
-- AGENCY SETTINGS
-- Egyetlen sor. Nem technikai kulcsok, hanem
-- vizuális és üzleti metaadatok.
-- ============================================
create table agency_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text default '#1f6feb',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PLATFORMS
-- Multi-platform-ready konfigurációs tábla.
-- MVP-ben csak Google Ads aktív.
-- ============================================
create table platforms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- 'google_ads'
  display_name text not null,                -- 'Google Ads'
  windsor_connector text not null,           -- 'google_ads'
  icon_color text not null,                  -- '#4285f4'
  icon_letter text not null,                 -- 'G'

  -- fields_config definiálja:
  -- - milyen mezőket kérünk a Windsorból
  -- - hogyan rendereljük a fiókszintű táblát
  -- - hogyan rendereljük a kampánytáblát
  -- - kampány megjelenítési limitek
  fields_config jsonb not null,

  is_active boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- CLIENTS
-- ============================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null
    check (type in ('webshop', 'szolgaltato')),
  industry text,
  contact_email text,
  logo_url text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CLIENT CONNECTIONS
-- Egy ügyfélhez több platform kapcsolat tartozhat.
-- ============================================
create table client_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  platform_id uuid not null references platforms(id),
  account_id text not null,
  account_name text,
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),

  unique(client_id, platform_id, account_id)
);

-- ============================================
-- PERIOD METRICS
-- Nem "monthly", mert egyedi időszakokat is kezel.
-- Egy connection adott időszakára vonatkozó
-- aggregált nyers adat + kampánybontás.
-- ============================================
create table period_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  connection_id uuid not null references client_connections(id) on delete cascade,

  period_start date not null,
  period_end date not null,

  impressions bigint,
  clicks bigint,
  ctr numeric(10,4),
  cpc numeric(12,2),
  spend numeric(14,2),
  conversions numeric(12,2),
  cost_per_conversion numeric(12,2),
  conversion_value numeric(14,2),
  roas numeric(10,4),

  extra_data jsonb default '{}',
  -- extra_data példák:
  -- {
  --   "search_impression_share": 42.1,
  --   "top_impression_share": 13.75,
  --   "average_order_value": 32096,
  --   "campaigns": [
  --     {
  --       "name": "Shopping - Összes termék",
  --       "clicks": 33396,
  --       "impressions": 1650890,
  --       "ctr": 2.02,
  --       "cpc": 52,
  --       "spend": 1728369,
  --       "conversions": 1349,
  --       "cost_per_conversion": 1281,
  --       "average_order_value": 32487,
  --       "conversion_value": 43844933,
  --       "roas": 25.37
  --     }
  --   ]
  -- }

  fetched_at timestamptz default now(),

  unique(connection_id, period_start, period_end)
);

-- ============================================
-- REPORTS
-- Egy riport egy aktuális szerkeszthető példány.
-- Nincs approval, nincs verziózás.
-- ============================================
create table reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  mode text not null
    check (mode in ('monthly', 'custom')),

  -- monthly report esetén az adott hónap első napja
  month_bucket date,

  current_period_start date not null,
  current_period_end date not null,
  comparison_period_start date not null,
  comparison_period_end date not null,

  -- Fontos: a riport a generáláskori típust használja,
  -- nem a client jelenlegi típusát.
  template_type text not null
    check (template_type in ('webshop', 'szolgaltato')),

  status text not null default 'draft'
    check (status in ('draft', 'completed')),

  last_generated_at timestamptz default now(),
  last_pdf_downloaded_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  check (current_period_start <= current_period_end),
  check (comparison_period_start <= comparison_period_end),
  check (
    (mode = 'monthly' and month_bucket is not null)
    or
    (mode = 'custom' and month_bucket is null)
  )
);

-- Egy havi riport / ügyfél / hónap
create unique index uniq_reports_monthly
  on reports(client_id, month_bucket)
  where mode = 'monthly';

-- Egyedi riport deduplikáció azonos current+comparison párokra
create unique index uniq_reports_custom
  on reports(
    client_id,
    current_period_start,
    current_period_end,
    comparison_period_start,
    comparison_period_end
  )
  where mode = 'custom';

-- ============================================
-- REPORT SECTIONS
-- Szöveges tartalom és enabled állapot.
-- A számtáblák a period_metrics-ből épülnek.
-- ============================================
create table report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  connection_id uuid references client_connections(id),
  section_type text not null
    check (section_type in ('platform_analysis', 'executive_summary', 'glossary')),
  ai_generated_text text,
  edited_text text,
  is_enabled boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index uniq_report_platform_sections
  on report_sections(report_id, connection_id)
  where section_type = 'platform_analysis';

create unique index uniq_report_executive_summary
  on report_sections(report_id, section_type)
  where section_type = 'executive_summary';

create unique index uniq_report_glossary
  on report_sections(report_id, section_type)
  where section_type = 'glossary';

-- ============================================
-- GLOSSARY TERMS
-- ============================================
create table glossary_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  full_name text,
  definition text not null,
  sort_order int default 0,
  is_active boolean default true
);

-- ============================================
-- INDEXEK
-- ============================================
create index idx_connections_client on client_connections(client_id);
create index idx_period_metrics_connection on period_metrics(connection_id);
create index idx_period_metrics_period on period_metrics(period_start, period_end);
create index idx_reports_client on reports(client_id);
create index idx_reports_month on reports(month_bucket);
create index idx_sections_report on report_sections(report_id);
```

### Miért nincs `pdf_url`?

Mert az MVP-ben a PDF nem perzisztált artifact. A letöltés mindig friss render.

### Miért nincs `approved_at`?

Mert nincs approval workflow.

### Miért nincs `monthly_metrics`?

Mert a rendszer nem csak havi riportokat kezel, hanem egyedi időszakosakat is.

---

## 9. Seed data

### 9.1 Platforms seed (MVP: csak Google Ads aktív)

```sql
insert into platforms (
  slug,
  display_name,
  windsor_connector,
  icon_color,
  icon_letter,
  is_active,
  sort_order,
  fields_config
)
values (
  'google_ads',
  'Google Ads',
  'google_ads',
  '#4285f4',
  'G',
  true,
  1,
  '{
    "api_fields": [
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "spend",
      "conversions",
      "cost_per_conversion",
      "conversion_value",
      "roas",
      "average_order_value",
      "search_impression_share",
      "top_impression_share"
    ],
    "account_table": {
      "webshop": [
        {"field": "clicks", "label": "Kattintás", "format": "num", "group": "forgalom"},
        {"field": "impressions", "label": "Megjelenés", "format": "num", "group": "forgalom"},
        {"field": "ctr", "label": "Átl. CTR", "format": "pct", "group": "forgalom"},
        {"field": "cpc", "label": "CPC", "format": "huf", "inverse": true, "group": "forgalom"},
        {"field": "spend", "label": "Költés", "format": "huf", "group": "forgalom"},
        {"field": "conversions", "label": "Konverziók", "format": "num", "group": "konverziok"},
        {"field": "cost_per_conversion", "label": "Konverzió/költség", "format": "huf", "inverse": true, "group": "konverziok"},
        {"field": "average_order_value", "label": "Kosárérték", "format": "huf", "group": "konverziok"},
        {"field": "conversion_value", "label": "Bevétel", "format": "huf", "group": "konverziok"},
        {"field": "roas", "label": "ROAS", "format": "x", "group": "konverziok"},
        {"field": "search_impression_share", "label": "Keresési megj. arány", "format": "pct", "group": "pozicio"},
        {"field": "top_impression_share", "label": "Felső megj. arány", "format": "pct", "group": "pozicio"}
      ],
      "szolgaltato": [
        {"field": "clicks", "label": "Kattintás", "format": "num", "group": "forgalom"},
        {"field": "impressions", "label": "Megjelenés", "format": "num", "group": "forgalom"},
        {"field": "ctr", "label": "Átl. CTR", "format": "pct", "group": "forgalom"},
        {"field": "cpc", "label": "CPC", "format": "huf", "inverse": true, "group": "forgalom"},
        {"field": "spend", "label": "Költés", "format": "huf", "group": "forgalom"},
        {"field": "conversions", "label": "Konverziók", "format": "num", "group": "konverziok"},
        {"field": "cost_per_conversion", "label": "CPA", "format": "huf", "inverse": true, "group": "konverziok"},
        {"field": "search_impression_share", "label": "Keresési megj. arány", "format": "pct", "group": "pozicio"},
        {"field": "top_impression_share", "label": "Felső megj. arány", "format": "pct", "group": "pozicio"}
      ]
    },
    "campaign_table": {
      "webshop": [
        "campaign",
        "clicks",
        "impressions",
        "ctr",
        "cpc",
        "spend",
        "conversions",
        "cost_per_conversion",
        "average_order_value",
        "conversion_value",
        "roas"
      ],
      "szolgaltato": [
        "campaign",
        "clicks",
        "impressions",
        "ctr",
        "cpc",
        "spend",
        "conversions",
        "cost_per_conversion"
      ]
    },
    "campaign_level": true,
    "campaign_display": {
      "sort_by": "spend",
      "limit": 10
    }
  }'::jsonb
);
```

### 9.2 Glossary seed

```sql
insert into glossary_terms (term, full_name, definition, sort_order) values
('CTR', 'Click-Through Rate / Átkattintási arány', 'Megmutatja, hogy a hirdetést látók hány százaléka kattintott rá.', 1),
('CPC', 'Cost Per Click / Kattintásonkénti költség', 'Ennyibe kerül átlagosan egy kattintás a hirdetésre.', 2),
('CPA', 'Cost Per Acquisition / Konverziónkénti költség', 'Ennyibe kerül átlagosan egy konverzió.', 3),
('ROAS', 'Return On Ad Spend / Hirdetési megtérülés', 'Minden elköltött 1 Ft hirdetésre mennyi bevétel jön vissza.', 4),
('Konverzió', null, 'Az ügyfél által meghatározott célművelet: vásárlás, ajánlatkérés, telefonhívás, regisztráció vagy más értékes aktivitás.', 5),
('Megjelenés', 'Impressions', 'Hányszor jelent meg a hirdetés.', 6),
('Elérés', 'Reach', 'Hány egyedi ember látta a hirdetést.', 7),
('Keresési megjelenítési részesedés', 'Search Impression Share', 'A hirdetés hányszor jelent meg ahhoz képest, ahányszor megjelenhetett volna.', 8),
('Kosárérték', 'Average Order Value', 'Egy átlagos vásárlás értéke forintban.', 9);
```

---

## 10. Windsor.ai integráció

### API referencia

- base URL: `https://connectors.windsor.ai/{connector}`
- auth: `api_key` query param
- dátum formátum: `YYYY-MM-DD`
- válasz: `{ "data": [...], "meta": { ... } }`

### Kritikus Windsor szabályok

**Account szűrés filter-rel történik, nem külön account query parammal**

```text
filter=[["account_id","eq","123-456-7890"]]
```

**Kampányszintű bontás**

A `campaign` mező hozzáadásával kapunk kampányonkénti sorokat.

**Fiókszintű aggregátum**

Ne kérjük le a `campaign` és a `date` mezőt, különben szétbontott adatot kapunk.

### Multi-platform-ready implementációs elv

Az adatlekérés legyen két részből álló:

1. generikus Windsor fetch
2. opcionális platform-adapter normalizálás

#### Miért kell adapter?

Mert bár a Windsor egységes API-t ad, a mezőnevek, special case-ek és hiányzó mezők platformonként eltérhetnek.

#### Példa irány

```typescript
type NormalizedMetrics = {
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  spend?: number;
  conversions?: number;
  cost_per_conversion?: number;
  conversion_value?: number;
  roas?: number;
  extra_data: Record<string, unknown>;
};

type PlatformAdapter = {
  normalizeAccountRow: (row: any) => NormalizedMetrics;
  normalizeCampaignRows: (rows: any[]) => Array<Record<string, unknown>>;
};

const adapter = adapters[platform.slug] ?? defaultAdapter;
```

### Generikus fetch függvény

```typescript
async function fetchPlatformData(
  platform: Platform,
  accountId: string,
  dateFrom: string,
  dateTo: string
) {
  const baseUrl = `https://connectors.windsor.ai/${platform.windsor_connector}`;
  const accountFilter = encodeURIComponent(
    JSON.stringify([["account_id", "eq", accountId]])
  );

  const apiFields = platform.fields_config.api_fields.join(",");

  const accountUrl =
    `${baseUrl}?api_key=${process.env.WINDSOR_API_KEY}` +
    `&fields=${apiFields}` +
    `&date_from=${dateFrom}` +
    `&date_to=${dateTo}` +
    `&filter=${accountFilter}`;

  let campaignData = null;

  if (platform.fields_config.campaign_level) {
    const campaignUrl =
      `${baseUrl}?api_key=${process.env.WINDSOR_API_KEY}` +
      `&fields=campaign,${apiFields}` +
      `&date_from=${dateFrom}` +
      `&date_to=${dateTo}` +
      `&filter=${accountFilter}`;

    campaignData = await fetch(campaignUrl).then((r) => r.json());
  }

  const accountData = await fetch(accountUrl).then((r) => r.json());

  return {
    accountRows: accountData.data ?? [],
    campaignRows: campaignData?.data ?? []
  };
}
```

### Generálási flow

1. Meghatározzuk a current és comparison periódusokat.
2. Lekérjük az ügyfél aktív `client_connections` sorait.
3. Minden connection-re:
   - current adatok lekérése
   - comparison adatok lekérése
   - normalizálás adapterrel
   - `period_metrics` upsert current időszakra
   - `period_metrics` upsert comparison időszakra
4. A current + comparison adatokból delta payloadot építünk memóriaoldalon.
5. Claude AI generál platform szövegeket.
6. Claude AI generál executive summary-t.
7. Létrehozzuk vagy frissítjük a `reports` rekordot.
8. Létrehozzuk vagy felülírjuk a `report_sections` rekordokat.
9. Redirect a szerkesztőre.

### Hasznos Windsor endpointok

| Endpoint | Cél |
|---|---|
| `GET /google_ads/fields?api_key=KEY` | mezővalidálás |
| `GET /google_ads/options?api_key=KEY` | account lista ellenőrzés |
| `GET /list_connectors` | elérhető connectorok |

---

## 11. Delta számítás szabályai

Ez a fejezet fontos, mert különben hibás vagy félrevezető UI készül.

### Alapszabály

Ha van aktuális és előző érték is, és az előző nem 0:

```text
delta = ((current - previous) / previous) * 100
```

### Edge case-ek

| Current | Previous | Megjelenítés |
|---|---|---|
| `null` | bármi | `—` |
| bármi | `null` | `—` |
| `0` | `0` | `0%` |
| `> 0` | `0` | `Új` |
| `0` | `> 0` | `-100%` |

### Színkód

- numerikus delta esetén:
  - normál mezőknél pozitív = zöld, negatív = piros
  - `inverse: true` mezőknél fordítva
- `Új` és `—` érték semleges szín
- `abs(delta) < 1%` esetén semleges szín

### Megjelenítési segédfüggvény

```typescript
function getDeltaPresentation(
  current: number | null,
  previous: number | null,
  inverse = false
) {
  if (current == null || previous == null) {
    return { label: "—", value: null, tone: "muted" };
  }

  if (current === 0 && previous === 0) {
    return { label: "0%", value: 0, tone: "muted" };
  }

  if (previous === 0 && current > 0) {
    return { label: "Új", value: null, tone: "muted" };
  }

  const delta = ((current - previous) / previous) * 100;

  if (Math.abs(delta) < 1) {
    return { label: `${delta.toFixed(1)}%`, value: delta, tone: "muted" };
  }

  const positive = inverse ? delta < 0 : delta > 0;

  return {
    label: `${delta.toFixed(1)}%`,
    value: delta,
    tone: positive ? "good" : "bad"
  };
}
```

---

## 12. AI integráció (Claude API)

### Generált szövegek típusai

1. platform elemzés platformonként
2. vezetői összefoglaló a riport végére

### Fontos elv

A Claude-nak ne nyers Windsor választ adjunk tovább, hanem előre normalizált, tömör, emberileg is értelmezhető JSON payloadot.

Ez:

- csökkenti a prompt komplexitást,
- stabilabb outputot ad,
- olcsóbb token szempontból.

### Platform elemzés prompt

```text
Szereped: tapasztalt PPC szakértő.

Feladat:
Írj 3-5 mondatos, magyar nyelvű, ügyfélnek is érthető elemzést
a(z) {platform_name} teljesítményéről.

Kontextus:
- ügyfél típusa: {client_type}
- iparág: {industry}

Tartalmazza:
- mi ment jól
- mi romlott vagy gyengült
- melyik kampány teljesített a legjobban
- melyik kampány teljesített a leggyengébben
- van-e konkrét javaslat a következő időszakra

Adat:
{normalized_report_payload}
```

### Executive summary prompt

```text
Szereped: tapasztalt online marketing szakértő, aki ügyfélbarát,
magyar nyelvű összefoglalót ír.

Írj rövid vezetői összefoglalót az összes platform alapján.

Tartalmazza:
- mi ment jól összességében
- mi igényel figyelmet
- van-e költségkeret vagy fókusz javaslat
- van-e következő lépés vagy kampányötlet

Az ügyfél nem marketing szakember.

Adat:
{all_platform_payloads}
```

### Szöveg prioritás

```typescript
function getDisplayText(section: ReportSection): string {
  return section.edited_text ?? section.ai_generated_text ?? "";
}
```

---

## 13. Riport generálás és újragenerálás részletes logikája

### 13.1 Új havi riport

#### Ha még nincs riport az adott hónapra

- létrehozunk egy `reports` rekordot `mode='monthly'` értékkel,
- kitöltjük a period mezőket,
- `status='draft'`,
- létrehozzuk a sectionöket.

#### Ha mégis már létezik

A dashboard ilyenkor már nem `Generálás`, hanem `Szerkesztés` gombot mutat.

### 13.2 Új egyedi riport

#### Ha nincs azonos dátumpárú riport

- új `reports` rekord készül `mode='custom'` értékkel.

#### Ha már létezik azonos dátumpár

- a meglévő riportot frissítjük,
- nem hozunk létre duplikátumot.

### 13.3 Teljes újragenerálás

Input:

- meglévő `report_id`

Lépések:

1. lekérjük a riporthoz tartozó dátumpárokat
2. lekérjük az aktív connectionöket
3. Windsor current + comparison fetch
4. `period_metrics` upsert
5. AI szövegek újragenerálása
6. `report_sections.ai_generated_text` felülírása
7. `report_sections.edited_text = null`
8. `reports.status = 'draft'`
9. `reports.last_generated_at = now()`

### 13.4 PDF letöltés

Input:

- `report_id`

Lépések:

1. lekérjük a riportot
2. lekérjük a szekciókat
3. lekérjük a current + comparison `period_metrics` sorokat minden active connection-höz
4. felépítjük a render payloadot
5. szerver oldalon PDF-et renderelünk
6. streameljük a böngészőnek
7. siker esetén:
   - `reports.status = 'completed'`
   - `reports.last_pdf_downloaded_at = now()`

---

## 14. Nem funkcionális döntések

### 14.1 Riport teljesítmény

Az MVP elfogadható célja:

- riport generálás: 5-20 másodperc
- editor megnyitás: normál hálózaton érezhetően gyors
- PDF generálás: néhány másodperc

### 14.2 Hibakezelés

Ha Windsor vagy Claude hiba történik:

- a generálás álljon meg,
- a modal jelezze, melyik fő fázis bukott el,
- legyen újrapróbálható a művelet.

### 14.3 Rate limit

Windsor rate limitre (`429`) legyen explicit hibaüzenet:

`A Windsor.ai átmenetileg túl sok kérést kapott. Próbáld újra pár perc múlva.`

---

## 15. Fejlesztési scope

### v1 — MVP

**Benne van:**

- Supabase setup
- auth egy felhasználóra
- `agency_settings`, `clients`, `platforms`, `client_connections`, `period_metrics`, `reports`, `report_sections`, `glossary_terms`
- havi dashboard
- ügyfél részletek
- platform összekötés
- Google Ads fetch Windsor.ai-on keresztül
- multi-platform-ready adatmodell és renderer
- havi riport generálás
- egyedi riport generálás
- report editor
- autosave
- section enable/disable
- platform szekció AI szöveg
- executive summary AI szöveg
- on-demand PDF export
- settings oldal
- top 10 kampány táblázat

**Nincs benne:**

- Meta implementáció
- GA4 implementáció
- diagramok
- email küldés
- cron
- PDF storage
- verziózott riporttörténet
- approval workflow
- multi-user

### v2

- Meta platform
- GA4 platform
- Search Console platform
- diagramok
- email küldés
- opcionális PDF cache/storage

### v3

- további platformok
- cron
- white-label
- multi-user
- SaaS irány

---

## 16. Havi költségek

| Tétel | Költség |
|---|---|
| Windsor.ai Standard plan | ~$99/hó |
| Claude API | ~$10-30/hó |
| Supabase Free tier | $0 |
| Vercel Hobby plan | $0 |
| @react-pdf/renderer | $0 |
| shadcn/ui | $0 |
| **Összesen** | **~$109-129/hó** |

---

## 17. Mappastruktúra

```text
reportkit/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                                # havi dashboard
│   ├── clients/
│   │   └── [id]/
│   │       ├── page.tsx                        # ügyfél részletek + riport előzmények
│   │       └── reports/
│   │           └── [reportId]/
│   │               └── page.tsx                # riport szerkesztő
│   ├── settings/
│   │   └── page.tsx                            # ügynökség név, logó, szín
│   └── api/
│       └── reports/
│           ├── generate/route.ts               # havi és egyedi generálás
│           ├── regenerate/route.ts             # teljes újragenerálás
│           ├── pdf/route.ts                    # on-demand PDF
│           └── sections/
│               └── regenerate/route.ts         # szekció újragenerálás
├── components/
│   ├── ui/
│   ├── dashboard/
│   │   ├── month-selector.tsx
│   │   ├── progress-bar.tsx
│   │   └── client-status-table.tsx
│   ├── clients/
│   │   ├── client-form.tsx
│   │   └── platform-connection-card.tsx
│   ├── reports/
│   │   ├── monthly-generate-dialog.tsx
│   │   ├── custom-report-dialog.tsx
│   │   ├── generation-progress.tsx
│   │   ├── report-editor.tsx
│   │   ├── account-metrics-table.tsx
│   │   ├── campaign-table.tsx
│   │   ├── section-card.tsx
│   │   └── text-editor.tsx
│   └── pdf/
│       ├── report-pdf.tsx
│       ├── pdf-cover.tsx
│       ├── pdf-metrics-table.tsx
│       ├── pdf-campaign-table.tsx
│       └── pdf-glossary.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── platforms/
│   │   ├── get-platform-config.ts
│   │   └── adapters/
│   │       ├── default.ts
│   │       └── google-ads.ts
│   ├── windsor/
│   │   └── fetch-platform-data.ts
│   ├── reports/
│   │   ├── build-report-payload.ts
│   │   ├── get-delta-presentation.ts
│   │   └── upsert-period-metrics.ts
│   ├── ai/
│   │   ├── generate-analysis.ts
│   │   └── generate-summary.ts
│   └── utils/
│       ├── format.ts
│       └── dates.ts
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── seed.sql
```

---

## 18. Konkrét implementációs megjegyzések

### 18.1 Report editor a `report.template_type` alapján renderel

Nem a kliens aktuális típusát kell nézni, hanem a riport generáláskori típust.

```typescript
function getAccountTableConfig(platform: Platform, reportTemplateType: "webshop" | "szolgaltato") {
  return platform.fields_config.account_table[reportTemplateType];
}
```

### 18.2 Autosave

```typescript
const debouncedSave = useDebouncedCallback(
  async (sectionId: string, text: string) => {
    await supabase
      .from("report_sections")
      .update({
        edited_text: text,
        updated_at: new Date().toISOString()
      })
      .eq("id", sectionId);

    await supabase
      .from("reports")
      .update({
        status: "draft",
        updated_at: new Date().toISOString()
      })
      .eq("id", reportId);
  },
  2000
);
```

### 18.3 Display text prioritás

```typescript
function getDisplayText(section: ReportSection): string {
  return section.edited_text ?? section.ai_generated_text ?? "";
}
```

### 18.4 Havi dashboard státusz meghatározás

Az adott kiválasztott hónaphoz tartozó havi riportból jön:

- ha nincs riport: `Nincs`
- ha van és `status='draft'`: `Piszkozat`
- ha van és `status='completed'`: `Kész`

### 18.5 Egyedi riportok nem számítanak a dashboard progressbe

Ez fix üzleti szabály, nem opcionális.

### 18.6 PDF mindig fresh render

Semmilyen korábban legenerált PDF-et nem kell elővenni cache-ből az MVP-ben.

---

## 19. Mi számít kész implementációnak?

Az MVP akkor tekinthető késznek, ha:

1. létrehozható ügyfél,
2. hozzáadható Google Ads kapcsolat,
3. a dashboardon látszik egy kiválasztott hónap státusza,
4. generálható havi riport,
5. generálható egyedi riport,
6. a riport szerkeszthető és autosave működik,
7. a teljes újragenerálás felülírja a riportot,
8. a PDF a legfrissebb állapotot tölti le,
9. a `completed` státusz letöltés után beáll,
10. új szerkesztés vagy újragenerálás után a riport visszamegy `draft` státuszba.

---

## 20. Rövid végkövetkeztetés

Ez a PRD szándékosan egy szűk, gyorsan szállítható MVP-t ír le.

A fő kompromisszumok:

- multi-platform-ready architektúra, de csak Google Ads implementáció,
- havi workflow elsődleges, custom riport másodlagos,
- nincs approval és nincs verziózás,
- nincs PDF storage,
- nincs túlfinomított realtime progress.

Ez a kombináció elég erős ahhoz, hogy az MVP valódi munkát váltson ki, de nem tolja el a fejlesztést platform-agnosztikus framework építés vagy workflow overengineering irányába.
