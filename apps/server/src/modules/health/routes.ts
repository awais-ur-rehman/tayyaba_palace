import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { db, sqlite } from "../../db/index.js";
import { invoices } from "../../db/schema.js";
import { fiscalAdapter } from "../../fiscal/index.js";
import { isPrinterReachable } from "../../printing/printer.js";
import { requireAuth } from "../../lib/require-auth.js";
import { runQueueOnce } from "../../fiscal/queue.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    let dbOk = true;
    try {
      sqlite.prepare("SELECT 1").get();
    } catch {
      dbOk = false;
    }

    const [fiscalOk, printerOk, pendingRow] = await Promise.all([
      fiscalAdapter.health(),
      isPrinterReachable(),
      Promise.resolve(
        db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.status, "PENDING"))
          .get()
      ),
    ]);

    return {
      db: dbOk,
      fiscal: fiscalOk,
      pendingInvoices: pendingRow?.count ?? 0,
      printer: printerOk,
    };
  });

  app.post("/api/sync", { preHandler: requireAuth }, async () => {
    return runQueueOnce();
  });
}
