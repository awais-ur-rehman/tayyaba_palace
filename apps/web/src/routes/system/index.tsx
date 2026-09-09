import { SyncPanel } from "@/components/system/sync-panel";
import { BackupPanel } from "@/components/system/backup-panel";
import { SettingsPanel } from "@/components/system/settings-panel";

export function SystemPage() {
  return (
    <div className="space-y-6 pb-12">
      <h1 className="font-heading text-2xl text-foreground">System</h1>
      <SyncPanel />
      <BackupPanel />
      <SettingsPanel />
    </div>
  );
}
