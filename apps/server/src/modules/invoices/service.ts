import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bookings, bookingLines, invoices, settings } from "../../db/schema.js";
import { fiscalAdapter } from "../../fiscal/index.js";
import { toFiscalInvoice, type BookingForFiscal } from "../../fiscal/mapper.js";

// Shared by: booking creation (immediate attempt), manual retry endpoint,
// and the background retry queue. One code path, one place invoice state
// transitions happen.
export async function attemptFiscalize(invoiceId: string): Promise<void> {
  const invoice = db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice || invoice.status === "FISCALIZED" || invoice.status === "VOID") return;

  const booking = db.select().from(bookings).where(eq(bookings.id, invoice.bookingId)).get();
  const lines = db.select().from(bookingLines).where(eq(bookingLines.bookingId, invoice.bookingId)).all();
  const s = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!booking || !s) return;

  const payload: BookingForFiscal = {
    usin: invoice.usin,
    posId: s.posId,
    dateTimeIso: booking.createdAt,
    clientName: booking.clientName,
    clientPntn: booking.clientPntn,
    clientCnic: booking.clientCnic,
    clientPhone: booking.clientPhone,
    paymentMode: booking.paymentMode,
    totalSaleValue: invoice.totalSaleValue,
    totalTaxCharged: invoice.totalTaxCharged,
    totalBillAmount: invoice.totalBillAmount,
    totalQuantity: invoice.totalQuantity,
    lines: lines.map((l) => ({
      itemCode: l.itemCode,
      itemName: l.itemName,
      pctCode: l.pctCode,
      taxRate: l.taxRate,
      quantity: l.quantity,
      saleValue: l.saleValue,
      taxCharged: l.taxCharged,
      totalAmount: l.totalAmount,
    })),
  };

  const fiscalInvoice = toFiscalInvoice(payload);
  const now = new Date().toISOString();
  const result = await fiscalAdapter.fiscalize(fiscalInvoice);

  if (result.ok) {
    db.update(invoices)
      .set({
        status: "FISCALIZED",
        fiscalInvoiceNumber: result.invoiceNumber,
        fiscalCode: result.code,
        responsePayload: JSON.stringify(result.raw),
        attempts: invoice.attempts + 1,
        lastAttemptAt: now,
        fiscalizedAt: now,
        lastError: null,
      })
      .where(eq(invoices.id, invoiceId))
      .run();
  } else {
    db.update(invoices)
      .set({
        status: "PENDING", // retry queue keeps trying; never auto-FAILED
        responsePayload: JSON.stringify(result.raw),
        attempts: invoice.attempts + 1,
        lastAttemptAt: now,
        lastError: result.message ?? "Unknown fiscalisation error",
      })
      .where(eq(invoices.id, invoiceId))
      .run();
  }
}
