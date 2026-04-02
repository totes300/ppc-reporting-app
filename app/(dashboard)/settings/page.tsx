import { SettingsForm } from "@/components/settings/settings-form";
import { getAgencySettings } from "@/lib/queries/agency";

export default async function SettingsPage() {
  const settings = await getAgencySettings();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <SettingsForm settings={settings} />
    </div>
  );
}
