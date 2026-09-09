import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { bookingInputSchema } from "@tayyaba/shared";
import { db } from "../../db/index.js";
import { bookings, bookingLines, invoices, settings, printJobs } from "../../db/schema.js";
import { requireAuth } from "../../lib/require-auth.js";
import { audit } from "../../lib/audit.js";
import { BookingValidationError, createBookingTransaction } from "./service.js";
import { attemptFiscalize } from "../invoices/service.js";
import { printReceipt } from "../../printing/printer.js";
import type { ReceiptData } from "../../printing/receipt.js";

async function buildReceipt(bookingId: string): Promise<ReceiptData> {
  const booking = db.select().from(bookings).where(eq(bookings.id, bookingId)).get()!;
  const invoice = db.select().from(invoices).where(eq(invoices.bookingId, bookingId)).get()!;
  const lines = db.select().from(bookingLines).where(eq(bookingLines.bookingId, bookingId)).all();
  const s = db.select().from(settings).where(eq(settings.id, 1)).get()!;

  return {
    businessName: s.businessName || "Tayyaba Palace",
    businessAddress: s.businessAddress,
    businessPhone: s.businessPhone,
    pntn: s.pntn,
    usin: invoice.usin,
    fiscalInvoiceNumber: invoice.fiscalInvoiceNumber ?? null,
    dateTimeIso: booking.createdAt,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    eventDate: booking.eventDate,
    guestCount: booking.guestCount,
    lines: lines.map((l) => ({
      itemName: l.itemName,
      category: l.category,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      saleValue: l.saleValue,
    })),
    totalSaleValue: invoice.totalSaleValue,
    totalTaxCharged: invoice.totalTaxCharged,
    totalBillAmount: invoice.totalBillAmount,
    paymentMode: booking.paymentMode,
    receiptFooter: s.receiptFooter,
  };
}

async function printAndRecord(bookingId: string, invoiceId: string, kind: "PROVISIONAL" | "FISCAL" | "REPRINT") {
  const receipt = await buildReceipt(bookingId);
  const result = await printReceipt(receipt);
  db.insert(printJobs)
    .values({
      id: randomUUID(),
      invoiceId,
      kind,
      status: result.ok ? "OK" : "FAILED",
      error: result.error ?? null,
      createdAt: new Date().toISOString(),
    })
    .run();
  return result;
}

export async function bookingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/bookings", async (req) => {
    const { q, from, to, status, page = "1" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = 20;

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          like(bookings.clientName, `%${q}%`),
          like(bookings.clientPhone, `%${q}%`),
          like(bookings.bookingNo, `%${q}%`)
        )
      );
    }
    if (from) conditions.push(gte(bookings.eventDate, from));
    if (to) conditions.push(lte(bookings.eventDate, to));
    if (status) conditions.push(eq(bookings.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = db
      .select()
      .from(bookings)
      .where(where)
      .orderBy(desc(bookings.eventDate))
      .limit(pageSize)
      .offset((pageNum - 1) * pageSize)
      .all();

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(where)
      .get();

    const withInvoices = rows.map((b) => {
      const invoice = db.select().from(invoices).where(eq(invoices.bookingId, b.id)).get();
      return { ...b, invoice };
    });

    return { rows: withInvoices, total: totalRow?.count ?? 0, page: pageNum, pageSize };
  });

  app.get("/api/bookings/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const booking = db.select().from(bookings).where(eq(bookings.id, id)).get();
    if (!booking) return reply.code(404).send({ error: "Booking not found." });

    const lines = db.select().from(bookingLines).where(eq(bookingLines.bookingId, id)).orderBy(bookingLines.sortOrder).all();
    const invoice = db.select().from(invoices).where(eq(invoices.bookingId, id)).get();
    const prints = invoice
      ? db.select().from(printJobs).where(eq(printJobs.invoiceId, invoice.id)).orderBy(desc(printJobs.createdAt)).all()
      : [];

    return { ...booking, lines, invoice, prints };
  });

  app.post("/api/bookings", async (req, reply) => {
    const parsed = bookingInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    let created: { bookingId: string; invoiceId: string };
    try {
      created = createBookingTransaction(parsed.data, req.session.userId!);
    } catch (err) {
      if (err instanceof BookingValidationError) {
        return reply.code(400).send({ error: err.message });
      }
      req.log.error(err, "booking save failed");
      return reply.code(500).send({ error: "Could not save the booking. Nothing was charged." });
    }

    audit({ userId: req.session.userId, action: "CREATE", entity: "booking", entityId: created.bookingId });

    await attemptFiscalize(created.invoiceId);

    const invoice = db.select().from(invoices).where(eq(invoices.id, created.invoiceId)).get()!;
    const printResult = await printAndRecord(
      created.bookingId,
      created.invoiceId,
      invoice.status === "FISCALIZED" ? "FISCAL" : "PROVISIONAL"
    );

    const booking = db.select().from(bookings).where(eq(bookings.id, created.bookingId)).get();
    return reply.code(201).send({
      booking,
      invoiceStatus: invoice.status,
      printOk: printResult.ok,
    });
  });

  app.patch("/api/bookings/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { clientPhone, notes } = req.body as { clientPhone?: string; notes?: string };
    const existing = db.select().from(bookings).where(eq(bookings.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "Booking not found." });

    db.update(bookings)
      .set({
        clientPhone: clientPhone ?? existing.clientPhone,
        notes: notes ?? existing.notes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.id, id))
      .run();

    audit({ userId: req.session.userId, action: "UPDATE", entity: "booking", entityId: id });
    return db.select().from(bookings).where(eq(bookings.id, id)).get();
  });

  app.post("/api/bookings/:id/cancel", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(bookings).where(eq(bookings.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "Booking not found." });

    db.update(bookings)
      .set({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .where(eq(bookings.id, id))
      .run();

    audit({ userId: req.session.userId, action: "CANCEL", entity: "booking", entityId: id });
    return { ok: true };
  });
}

export { buildReceipt, printAndRecord };
