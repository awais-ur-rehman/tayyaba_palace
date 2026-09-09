import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { BookingInput } from "@tayyaba/shared";
import { db, sqlite } from "../../db/index.js";
import { bookings, bookingLines, invoices, inventoryItems, settings } from "../../db/schema.js";
import { mul, taxOn } from "../../lib/money.js";
import { allocateUsin, allocateBookingNo } from "../../lib/usin.js";

export class BookingValidationError extends Error {}

// Transaction order matches TECHNICAL_SPEC.md §6 exactly: the booking is
// durable before any I/O to the printer or PRA. Neither can lose a sale.
export function createBookingTransaction(input: BookingInput, createdBy: string) {
  const itemIds = [...new Set(input.lines.map((l) => l.itemId))];
  const items = db.select().from(inventoryItems).where(inArray(inventoryItems.id, itemIds)).all();
  const itemsById = new Map(items.map((i) => [i.id, i]));

  for (const id of itemIds) {
    if (!itemsById.has(id)) throw new BookingValidationError(`Unknown inventory item: ${id}`);
  }

  const s = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!s) throw new Error("Settings not seeded");

  const run = sqlite.transaction(() => {
    const now = new Date().toISOString();
    const bookingId = randomUUID();
    const bookingNo = allocateBookingNo(sqlite);

    let totalSale = 0;
    let totalTax = 0;
    let totalAmount = 0;
    let totalQuantity = 0;

    const lineRows = input.lines.map((line, idx) => {
      const item = itemsById.get(line.itemId)!;
      const saleValue = mul(line.unitPrice, line.quantity);
      const taxCharged = taxOn(saleValue, item.taxRate);
      const lineTotal = saleValue + taxCharged;

      totalSale += saleValue;
      totalTax += taxCharged;
      totalAmount += lineTotal;
      totalQuantity += line.quantity;

      return {
        id: randomUUID(),
        bookingId,
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        pctCode: item.pctCode,
        taxRate: item.taxRate,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        saleValue,
        taxCharged,
        totalAmount: lineTotal,
        sortOrder: idx,
      };
    });

    db.insert(bookings)
      .values({
        id: bookingId,
        bookingNo,
        clientName: input.clientName,
        clientPhone: input.clientPhone || "",
        clientCnic: input.clientCnic || "",
        clientPntn: input.clientPntn || "",
        eventDate: input.eventDate,
        eventTime: input.eventTime || "",
        guestCount: input.guestCount,
        paymentMode: input.paymentMode,
        notes: input.notes || "",
        status: "ACTIVE",
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    for (const row of lineRows) {
      db.insert(bookingLines).values(row).run();
    }

    const usin = allocateUsin(sqlite, s.usinPrefix);
    const invoiceId = randomUUID();
    db.insert(invoices)
      .values({
        id: invoiceId,
        bookingId,
        usin,
        invoiceType: 1,
        status: "PENDING",
        totalSaleValue: totalSale,
        totalTaxCharged: totalTax,
        totalBillAmount: totalAmount,
        totalQuantity,
        attempts: 0,
        createdAt: now,
      })
      .run();

    return { bookingId, invoiceId };
  });

  return run();
}
