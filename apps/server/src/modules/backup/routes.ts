import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../../lib/require-auth.js";
import { audit } from "../../lib/audit.js";
import { createBackup, listBackups, getBackup, isValidSqliteBackup, restoreFrom } from "./service.js";

export async function backupRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/api/backup", async (req) => {
    const backup = createBackup("MANUAL");
    audit({ userId: req.session.userId, action: "CREATE", entity: "backup", entityId: backup.id });
    return backup;
  });

  app.get("/api/backups", async () => listBackups());

  app.get("/api/backups/:id/download", async (req, reply) => {
    const { id } = req.params as { id: string };
    const backup = getBackup(id);
    if (!backup || !fs.existsSync(backup.path)) return reply.code(404).send({ error: "Backup not found." });

    reply.header("Content-Disposition", `attachment; filename="${path.basename(backup.path)}"`);
    return reply.send(fs.createReadStream(backup.path));
  });

  app.post("/api/backups/restore", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "No file uploaded." });

    const fields = data.fields as Record<string, { value?: string }>;
    if (fields.confirm?.value !== "RESTORE") {
      return reply.code(400).send({ error: 'Type RESTORE to confirm.' });
    }

    const tmpPath = path.join(os.tmpdir(), `tayyaba-restore-${randomUUID()}.db`);
    await new Promise<void>((resolve, reject) => {
      const ws = fs.createWriteStream(tmpPath);
      data.file.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
    });

    if (!isValidSqliteBackup(tmpPath)) {
      fs.rmSync(tmpPath, { force: true });
      return reply.code(400).send({ error: "This file is not a valid Tayyaba Palace backup." });
    }

    audit({ userId: req.session.userId, action: "RESTORE", entity: "backup" });
    restoreFrom(tmpPath);
    fs.rmSync(tmpPath, { force: true });

    reply.send({ ok: true, message: "Restore complete. The application will restart." });
    setTimeout(() => process.exit(0), 500);
  });
}
