import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FiscalBadge } from "./fiscal-badge";
import { useBooking, useCancelBooking, useReprint, useRetryFiscalize } from "@/lib/bookings";
import { useToast } from "@/components/toast";
import { formatMoney, formatDate } from "@/lib/utils";
import { PAYMENT_MODES, type PaymentMode } from "@tayyaba/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function BookingDetailSheet({
  bookingId,
  onClose,
}: {
  bookingId: string | null;
  onClose: () => void;
}) {
  const { data: booking } = useBooking(bookingId);
  const cancelBooking = useCancelBooking();
  const retryFiscalize = useRetryFiscalize();
  const reprint = useReprint();
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const lines = booking?.lines ?? [];
  const byCategory = lines.reduce<Record<string, typeof lines>>((acc, l) => {
    (acc[l.category] ??= []).push(l);
    return acc;
  }, {});

  return (
    <Sheet open={!!bookingId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {booking && (
          <>
            <SheetHeader>
              <SheetTitle>
                {booking.bookingNo} · {booking.clientName}
              </SheetTitle>
              <div className="mt-2 flex items-center gap-2">
                <FiscalBadge invoice={booking.invoice} />
                {booking.status === "CANCELLED" && (
                  <span className="text-xs font-medium text-destructive">Cancelled</span>
                )}
              </div>
            </SheetHeader>

            <SheetBody className="space-y-6">
              <section className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{booking.clientName}</p>
                  {booking.clientPhone && <p className="text-muted-foreground">{booking.clientPhone}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Event</p>
                  <p className="font-medium">
                    {formatDate(booking.eventDate)} {booking.eventTime && `· ${booking.eventTime}`}
                  </p>
                  <p className="text-muted-foreground">{booking.guestCount} guests</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment mode</p>
                  <p className="font-medium">{PAYMENT_MODES[booking.paymentMode as PaymentMode]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">USIN</p>
                  <p className="font-medium">{booking.invoice?.usin ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PRA invoice</p>
                  <p className="font-medium">{booking.invoice?.fiscalInvoiceNumber ?? "Pending"}</p>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bill
                </h3>
                <div className="space-y-3">
                  {Object.entries(byCategory).map(([category, catLines]) => (
                    <div key={category}>
                      <p className="mb-1 text-xs font-semibold text-foreground">{category}</p>
                      {catLines.map((l) => (
                        <div key={l.id} className="flex justify-between border-b border-border py-1.5 text-sm">
                          <span>
                            {l.itemName} × {l.quantity}
                          </span>
                          <span className="tabular-nums">{formatMoney(l.saleValue)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {booking.invoice && (
                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sale value</span>
                      <span className="tabular-nums">{formatMoney(booking.invoice.totalSaleValue)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sales tax</span>
                      <span className="tabular-nums">{formatMoney(booking.invoice.totalTaxCharged)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold">
                      <span>TOTAL</span>
                      <span className="tabular-nums">{formatMoney(booking.invoice.totalBillAmount)}</span>
                    </div>
                  </div>
                )}
              </section>

              {booking.invoice?.lastError && (
                <p className="rounded-md bg-warning/10 p-3 text-xs text-warning-foreground">
                  Last fiscal error: {booking.invoice.lastError}
                </p>
              )}
            </SheetBody>

            <SheetFooter>
              {booking.invoice && (
                <Button
                  variant="outline"
                  onClick={() =>
                    reprint.mutate(booking.invoice!.id, {
                      onSuccess: () => toast("Receipt sent to printer."),
                      onError: (e) => toast(`Reprint failed: ${(e as Error).message}`, "error"),
                    })
                  }
                  disabled={reprint.isPending}
                >
                  Reprint
                </Button>
              )}
              {booking.invoice && booking.invoice.status !== "FISCALIZED" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    retryFiscalize.mutate(booking.invoice!.id, {
                      onSuccess: (inv) =>
                        toast(
                          inv.status === "FISCALIZED" ? "Fiscalised successfully." : "Still pending — will retry automatically.",
                          inv.status === "FISCALIZED" ? "success" : "warning"
                        ),
                    })
                  }
                  disabled={retryFiscalize.isPending}
                >
                  Retry fiscalisation
                </Button>
              )}
              {booking.status === "ACTIVE" && (
                <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                  Cancel booking
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The booking is marked cancelled in this system, but the invoice already reported to PRA is not
            reversed. Handling that with PRA is a manual process for now.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (bookingId) cancelBooking.mutate(bookingId);
                setConfirmCancel(false);
              }}
            >
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
