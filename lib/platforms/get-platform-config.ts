import { defaultAdapter, type PlatformAdapter } from "./adapters/default";
import { googleAdsAdapter } from "./adapters/google-ads";

const adapters: Record<string, PlatformAdapter> = {
  google_ads: googleAdsAdapter,
};

export function getAdapter(platformSlug: string): PlatformAdapter {
  return adapters[platformSlug] ?? defaultAdapter;
}
