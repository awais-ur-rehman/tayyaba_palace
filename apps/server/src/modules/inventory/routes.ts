import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { inventoryItemSchema, unitForCategory } from "@tayyaba/shared";
import { db } from "../../db/index.js";
import { inventoryItems } from "../../db/schema.js";
import { requireAuth } from "../../lib/require-auth.js";
import { audit } from "../../lib/audit.js";

export async function inventoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/inventory", async (req) => {
    const { category, active } = req.query as { category?: string; active?: string };
    const conditions = [];
    if (category) conditions.push(eq(inventoryItems.category, category));
    if (active !== undefined) conditions.push(eq(inventoryItems.active, active === "true" ? 1 : 0));

    const rows = db
      .select()
      .from(inventoryItems)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(inventoryItems.createdAt))
      .all();
    return rows;
  });

  app.post("/api/inventory", async (req, reply) => {
    const parsed = inventoryItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const input = parsed.data;

    const existing = db.select().from(inventoryItems).where(eq(inventoryItems.code, input.code)).get();
    if (existing) return reply.code(409).send({ error: "Item code already exists." });

    const now = new Date().toISOString();
    const id = randomUUID();
    db.insert(inventoryItems)
      .values({
        id,
        code: input.code,
        category: input.category,
        name: input.name,
        unit: unitForCategory(input.category),
        defaultPrice: input.defaultPrice,
        pctCode: input.pctCode,
        taxRate: input.taxRate,
        active: input.active ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    audit({ userId: req.session.userId, action: "CREATE", entity: "inventory_item", entityId: id });
    return reply.code(201).send(db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get());
  });

  app.patch("/api/inventory/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = inventoryItemSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const existing = db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "Item not found." });

    const { active, ...rest } = parsed.data;
    db.update(inventoryItems)
      .set({ ...rest, ...(active !== undefined ? { active: active ? 1 : 0 } : {}), updatedAt: new Date().toISOString() })
      .where(eq(inventoryItems.id, id))
      .run();

    audit({ userId: req.session.userId, action: "UPDATE", entity: "inventory_item", entityId: id, detail: parsed.data });
    return db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
  });

  app.post("/api/inventory/:id/archive", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "Item not found." });

    db.update(inventoryItems)
      .set({ active: 0, updatedAt: new Date().toISOString() })
      .where(eq(inventoryItems.id, id))
      .run();

    audit({ userId: req.session.userId, action: "ARCHIVE", entity: "inventory_item", entityId: id });
    return { ok: true };
  });
}
