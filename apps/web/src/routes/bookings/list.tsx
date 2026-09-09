import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FiscalBadge } from "@/components/bookings/fiscal-badge";
import { BookingDetailSheet } from "@/components/bookings/detail-sheet";
import { useBookings, useReprint, useRetryFiscalize } from "@/lib/bookings";
import { useToast } from "@/components/toast";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export function BookingsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  const { data, isLoading } = useBookings({ q: q || undefined, status: status || undefined, page });
  const reprint = useReprint();
  const retryFiscalize = useRetryFiscalize();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/bookings/new");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const rows = data?.rows ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">Bookings</h1>
        <Button onClick={() => navigate("/bookings/new")}>
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, booking no"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => {
            setStatus(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState hasQuery={!!q} onNew={() => navigate("/bookings/new")} onClearSearch={() => setQ("")} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>B-No</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Event date</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fiscal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => setOpenBookingId(b.id)}
                    className={cn("cursor-pointer", b.status === "CANCELLED" && "opacity-50")}
                  >
                    <TableCell className={cn(b.status === "CANCELLED" && "line-through")}>{b.bookingNo}</TableCell>
                    <TableCell className={cn(b.status === "CANCELLED" && "line-through")}>{b.clientName}</TableCell>
                    <TableCell>{formatDate(b.eventDate)}</TableCell>
                    <TableCell>{b.guestCount}</TableCell>
                    <TableCell className="tabular-nums">
                      {b.invoice ? formatMoney(b.invoice.totalBillAmount) : "—"}
                    </TableCell>
                    <TableCell>
                      <FiscalBadge invoice={b.invoice} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setOpenBookingId(b.id)}>View</DropdownMenuItem>
                          {b.invoice && (
                            <DropdownMenuItem
                              onClick={() =>
                                reprint.mutate(b.invoice!.id, {
                                  onSuccess: () => toast("Receipt sent to printer."),
                                  onError: (e) => toast(`Reprint failed: ${(e as Error).message}`, "error"),
                                })
                              }
                            >
                              Reprint receipt
                            </DropdownMenuItem>
                          )}
                          {b.invoice && b.invoice.status !== "FISCALIZED" && (
                            <DropdownMenuItem onClick={() => retryFiscalize.mutate(b.invoice!.id)}>
                              Retry fiscalisation
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                rows {(page - 1) * (data?.pageSize ?? 20) + 1}–{Math.min(page * (data?.pageSize ?? 20), data?.total ?? 0)} of{" "}
                {data?.total ?? 0}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ‹
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <BookingDetailSheet bookingId={openBookingId} onClose={() => setOpenBookingId(null)} />
    </div>
  );
}

function EmptyState({
  hasQuery,
  onNew,
  onClearSearch,
}: {
  hasQuery: boolean;
  onNew: () => void;
  onClearSearch: () => void;
}) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">No bookings match your search.</p>
        <Button variant="outline" onClick={onClearSearch}>
          Clear search
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">No bookings yet. Create your first booking to get started.</p>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4" /> New Booking
      </Button>
    </div>
  );
}
