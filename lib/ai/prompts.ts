import type { DeltaPayload, AccountMetric } from "@/lib/reports/build-report-payload";
import type { ClientType } from "@/lib/supabase/types";

/** Strip internal fields from payload before sending to AI */
function toAiPayload(payload: DeltaPayload) {
  return {
    platformName: payload.platformName,
    accountMetrics: payload.accountMetrics.map(stripMetricInternals),
    topCampaigns: payload.topCampaigns,
  };
}

function stripMetricInternals(m: AccountMetric) {
  return {
    label: m.label,
    format: m.format,
    group: m.group,
    current: m.current,
    previous: m.previous,
    delta: m.delta,
  };
}

export type PeriodDates = {
  currentStart: string;
  currentEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
};

export const SYSTEM_PROMPT = `Tapasztalt PPC és online marketing szakértő vagy, aki magyar nyelvű ügyfélriportokat ír.

Szabályok:
- MINDIG magyarul válaszolj, soha ne válts angol nyelvre.
- Ügyfélbarát, közérthető nyelven fogalmazz — az olvasó nem marketing szakember.
- Ne használj markdown formázást (sem **bold**, sem fejléceket, sem listákat). Folyószöveget írj.
- Számokat magyar formátumban használj (szóköz mint ezres elválasztó, vesszős tizedes).
- A pénznemet Ft-ban add meg.
- Tömören és lényegre törően fogalmazz.`;

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  webshop: "webshop (e-commerce)",
  szolgaltato: "szolgáltató (lead generálás)",
};

const CLIENT_TYPE_FOCUS: Record<ClientType, string> = {
  webshop:
    "Különösen fontos a ROAS, a konverziós érték és a bevétel alakulása.",
  szolgaltato:
    "Különösen fontos a konverziónkénti költség (CPL) és az érdeklődők száma.",
};

export function buildPlatformAnalysisPrompt(
  payload: DeltaPayload,
  clientType: ClientType,
  industry: string | null,
  dates: PeriodDates
): string {
  return `Feladat:
Írj pontosan 3-5 mondatos, magyar nyelvű, ügyfélnek is érthető elemzést a(z) ${payload.platformName} teljesítményéről.

Kontextus:
- Ügyfél típusa: ${CLIENT_TYPE_LABELS[clientType]}
- Iparág: ${industry ?? "nem megadott"}
- Aktuális időszak: ${dates.currentStart} – ${dates.currentEnd}
- Összehasonlítási időszak: ${dates.comparisonStart} – ${dates.comparisonEnd}

${CLIENT_TYPE_FOCUS[clientType]}

Tartalmazza:
- mi ment jól
- mi romlott vagy gyengült
- melyik kampány teljesített a legjobban
- melyik kampány teljesített a leggyengébben
- van-e konkrét javaslat a következő időszakra

Az adatban a "delta" mező a változást mutatja az előző időszakhoz képest. A "tone" mező: "good" = javulás, "bad" = romlás, "muted" = nem értékelhető.

<adatok>
${JSON.stringify(toAiPayload(payload), null, 2)}
</adatok>`;
}

export function buildExecutiveSummaryPrompt(
  payloads: DeltaPayload[],
  clientType: ClientType,
  industry: string | null,
  dates: PeriodDates
): string {
  return `Feladat:
Írj rövid (4-6 mondatos) vezetői összefoglalót az összes platform teljesítménye alapján.

Kontextus:
- Ügyfél típusa: ${CLIENT_TYPE_LABELS[clientType]}
- Iparág: ${industry ?? "nem megadott"}
- Aktuális időszak: ${dates.currentStart} – ${dates.currentEnd}
- Összehasonlítási időszak: ${dates.comparisonStart} – ${dates.comparisonEnd}

${CLIENT_TYPE_FOCUS[clientType]}

Tartalmazza:
- mi ment jól összességében
- mi igényel figyelmet
- van-e költségkeret vagy fókusz javaslat
- az utolsó mondatban adj egy konkrét, megvalósítható javaslatot a következő hónapra

Ha több platform adatai is vannak, hasonlítsd össze röviden a platformok teljesítményét.
Az ügyfél nem marketing szakember.

Az adatban a "delta" mező a változást mutatja az előző időszakhoz képest. A "tone" mező: "good" = javulás, "bad" = romlás, "muted" = nem értékelhető.

<adatok>
${JSON.stringify(payloads.map(toAiPayload), null, 2)}
</adatok>`;
}
