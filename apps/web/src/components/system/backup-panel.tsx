import { useRef, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBackups, useCreateBackupNow, useRestoreBackup } from "@/lib/system";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/utils";

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupPanel() {
  const { data: backups = [] } = useBackups();
  const createNow = useCreateBackupNow();
  const restore = useRestoreBackup();
  const { toast } = useToast();

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latest = backups[0];

  async function onRestore() {
    if (!file) return setRestoreError("Choose a backup file.");
    if (confirmText !== "RESTORE") return setRestoreError('Type "RESTORE" to confirm.');
    try {
      await restore.mutateAsync(file);
      toast("Restore complete. The application will restart.", "success");
      setRestoreOpen(false);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Restore failed.");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-heading text-lg text-foreground">Backup</h2>

      <div className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Location</span>
          <span className="font-medium">C:\TayyabaPalace\backups</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Schedule</span>
          <span className="font-medium">Daily at 03:00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last backup</span>
          <span className="font-medium">
            {latest ? `${formatDate(latest.createdAt)} · ${formatSize(latest.sizeBytes)}` : "None yet"}
          </span>
        </div>
      </div>

      <div className="mb-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRestoreOpen(true)}>
          Restore…
        </Button>
        <Button
          onClick={() =>
            createNow.mutate(undefined, { onSuccess: () => toast("Backup created.") })
          }
          disabled={createNow.isPending}
        >
          {createNow.isPending ? "Backing up…" : "Back Up Now"}
        </Button>
      </div>

      {backups.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.path.split(/[/\\]/).pop()}</TableCell>
                <TableCell>{formatSize(b.sizeBytes)}</TableCell>
                <TableCell>
                  <a
                    href={`/api/backups/${b.id}/download`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span>This laptop holds the only copy. Copy a backup to a USB drive regularly.</span>
      </div>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              All data since the backup's date will be lost. This cannot be undone.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".db"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Type RESTORE to confirm</label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            </div>
            {restoreError && <p className="text-sm text-destructive">{restoreError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onRestore} disabled={restore.isPending}>
              {restore.isPending ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
