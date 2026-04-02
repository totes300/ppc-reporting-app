import type { Platform } from "@/lib/supabase/types";

export type WindsorResponse = {
  accountRows: Record<string, unknown>[];
  campaignRows: Record<string, unknown>[];
};

export async function fetchPlatformData(
  platform: Platform,
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<WindsorResponse> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    throw new Error("WINDSOR_API_KEY nincs beállítva a környezeti változókban.");
  }

  const baseUrl = `https://connectors.windsor.ai/${platform.windsor_connector}`;
  const accountFilter = encodeURIComponent(
    JSON.stringify([["account_id", "eq", accountId]])
  );
  const apiFields = platform.fields_config.api_fields.join(",");

  const accountUrl =
    `${baseUrl}?api_key=${apiKey}` +
    `&fields=${apiFields}` +
    `&date_from=${dateFrom}` +
    `&date_to=${dateTo}` +
    `&filter=${accountFilter}`;

  const fetches: [Promise<Response>, Promise<Response> | null] = [
    fetch(accountUrl),
    null,
  ];

  if (platform.fields_config.campaign_level) {
    const campaignUrl =
      `${baseUrl}?api_key=${apiKey}` +
      `&fields=campaign,${apiFields}` +
      `&date_from=${dateFrom}` +
      `&date_to=${dateTo}` +
      `&filter=${accountFilter}`;
    fetches[1] = fetch(campaignUrl);
  }

  const [accountResponse, campaignResponse] = await Promise.all([
    fetches[0],
    fetches[1],
  ]);

  if (!accountResponse.ok) {
    const status = accountResponse.status;
    if (status === 429) {
      throw new Error(
        "A Windsor.ai átmeneti jelleggel túl sok kérést kapott. Próbáld újra később."
      );
    }
    throw new Error(
      `Windsor.ai hiba (${platform.display_name}): ${status} ${accountResponse.statusText}`
    );
  }

  const accountData = await accountResponse.json();

  let campaignRows: Record<string, unknown>[] = [];
  if (campaignResponse) {
    if (!campaignResponse.ok) {
      throw new Error(
        `Windsor.ai kampányadat hiba (${platform.display_name}): ${campaignResponse.status} ${campaignResponse.statusText}`
      );
    }
    const campaignData = await campaignResponse.json();
    campaignRows = campaignData.data ?? [];
  }

  return {
    accountRows: accountData.data ?? [],
    campaignRows,
  };
}
