import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { settingsSchema } from "@tayyaba/shared";
import { db } from "../../db/index.js";
import { settings } from "../../db/schema.js";
import { requireAuth } from "../../lib/require-auth.js";
import { audit } from "../../lib/audit.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/settings", async () => {
    return db.select().from(settings).where(eq(settings.id, 1)).get();
  });

  app.patch("/api/settings", async (req, reply) => {
    const parsed = settingsSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.update(settings).set(parsed.data).where(eq(settings.id, 1)).run();
    audit({ userId: req.session.userId, action: "UPDATE", entity: "settings", entityId: "1", detail: parsed.data });
    return db.select().from(settings).where(eq(settings.id, 1)).get();
  });
}
