import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../lib/require-auth.js";
import { printReceipt } from "../../printing/printer.js";
import { db } from "../../db/index.js";
import { settings } from "../../db/schema.js";

export async function printerRoutes(app: FastifyInstance) {
  app.post("/api/printer/test", { preHandler: requireAuth }, async (req, reply) => {
    const s = db.select().from(settings).where(eq(settings.id, 1)).get()!;
    const result = await printReceipt({
      businessName: s.businessName || "Tayyaba Palace",
      businessAddress: s.businessAddress,
      businessPhone: s.businessPhone,
      pntn: s.pntn,
      usin: "TEST",
      fiscalInvoiceNumber: null,
      dateTimeIso: new Date().toISOString(),
      clientName: "Test Print",
      clientPhone: "",
      eventDate: "",
      guestCount: 0,
      lines: [],
      totalSaleValue: 0,
      totalTaxCharged: 0,
      totalBillAmount: 0,
      paymentMode: 1,
      receiptFooter: s.receiptFooter,
    });

    if (!result.ok) return reply.code(502).send({ error: result.error ?? "Test print failed." });
    return { ok: true };
  });
}
