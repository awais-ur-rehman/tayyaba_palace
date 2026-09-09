import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { invoices, bookings } from "../../db/schema.js";
import { requireAuth } from "../../lib/require-auth.js";
import { attemptFiscalize } from "./service.js";
import { printAndRecord } from "../bookings/routes.js";

export async function invoicesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/invoices/last-sync", async () => {
    const [latest] = db
      .select()
      .from(invoices)
      .where(eq(invoices.status, "FISCALIZED"))
      .all()
      .filter((i) => i.fiscalizedAt)
      .sort((a, b) => (b.fiscalizedAt ?? "").localeCompare(a.fiscalizedAt ?? ""));
    return { lastSyncAt: latest?.fiscalizedAt ?? null };
  });

  app.get("/api/invoices/pending", async () => {
    const pending = db.select().from(invoices).where(eq(invoices.status, "PENDING")).all();
    return pending.map((inv) => {
      const booking = db.select().from(bookings).where(eq(bookings.id, inv.bookingId)).get();
      return { ...inv, clientName: booking?.clientName ?? "" };
    });
  });

  app.post("/api/invoices/:id/fiscalize", async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!invoice) return reply.code(404).send({ error: "Invoice not found." });

    await attemptFiscalize(id);
    const updated = db.select().from(invoices).where(eq(invoices.id, id)).get();
    return updated;
  });

  app.post("/api/invoices/:id/print", async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!invoice) return reply.code(404).send({ error: "Invoice not found." });

    const result = await printAndRecord(
      invoice.bookingId,
      invoice.id,
      invoice.status === "FISCALIZED" ? "FISCAL" : "REPRINT"
    );
    if (!result.ok) return reply.code(502).send({ error: result.error ?? "Print failed" });
    return { ok: true };
  });
}
