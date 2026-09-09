import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import { auditLog } from "../db/schema.js";

export function audit(entry: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: unknown;
}) {
  db.insert(auditLog)
    .values({
      id: randomUUID(),
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      detail: entry.detail ? JSON.stringify(entry.detail) : null,
      createdAt: new Date().toISOString(),
    })
    .run();
}
