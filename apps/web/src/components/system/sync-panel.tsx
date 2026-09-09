import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useHealth } from "@/lib/use-health";
import { usePendingInvoices, useLastSync, useSyncNow } from "@/lib/system";
import { useRetryFiscalize } from "@/lib/bookings";
import { cn, formatMoney, formatDate } from "@/lib/utils";

export function SyncPanel() {
  const { data: health } = useHealth();
  const { data: pending = [] } = usePendingInvoices();
  const { data: lastSync } = useLastSync();
  const syncNow = useSyncNow();
  const retryOne = useRetryFiscalize();

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-heading text-lg text-foreground">Fiscal Sync</h2>

      <div className="mb-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">PRA fiscal service</span>
          <StatusDotInline ok={!!health?.fiscal} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending invoices</span>
          <span className="font-medium">{health?.pendingInvoices ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last successful sync</span>
          <span className="font-medium">{lastSync?.lastSyncAt ? formatDate(lastSync.lastSyncAt) : "Never"}</span>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={() => syncNow.mutate()} disabled={syncNow.isPending || pending.length === 0}>
          {syncNow.isPending ? "Syncing…" : "Sync Now"}
        </Button>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-md bg-success/10 p-3 text-sm text-success">All invoices are synced with PRA.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>USIN</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Tries</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.usin}</TableCell>
                <TableCell>{inv.clientName}</TableCell>
                <TableCell className="tabular-nums">{formatMoney(inv.totalBillAmount)}</TableCell>
                <TableCell>{inv.attempts}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => retryOne.mutate(inv.id)}>
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!health?.fiscal && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Fiscal service is not responding. Check that FiscalizationService is running in Windows Services.
        </p>
      )}
    </section>
  );
}

function StatusDotInline({ ok }: { ok: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-success" : "bg-destructive")} />
      {ok ? "Responding" : "Not responding"}
    </span>
  );
}
