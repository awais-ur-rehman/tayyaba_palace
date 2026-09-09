import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { config } from "../../config.js";
import { db, sqlite } from "../../db/index.js";
import { backups } from "../../db/schema.js";

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function sha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function createBackup(kind: "MANUAL" | "SCHEDULED" = "MANUAL") {
  fs.mkdirSync(config.backupDir, { recursive: true });
  const filename = `tayyaba-${timestamp()}.db`;
  const filePath = path.join(config.backupDir, filename);

  // VACUUM INTO takes a consistent snapshot without stopping writes.
  sqlite.exec(`VACUUM INTO '${filePath.replace(/'/g, "''")}'`);

  const sizeBytes = fs.statSync(filePath).size;
  const checksum = sha256(filePath);
  const id = randomUUID();

  db.insert(backups)
    .values({ id, path: filePath, sizeBytes, kind, checksum, createdAt: new Date().toISOString() })
    .run();

  pruneScheduledBackups();

  return db.select().from(backups).where(eq(backups.id, id)).get()!;
}

function pruneScheduledBackups() {
  const scheduled = db
    .select()
    .from(backups)
    .where(eq(backups.kind, "SCHEDULED"))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const old of scheduled.slice(30)) {
    fs.rmSync(old.path, { force: true });
    db.delete(backups).where(eq(backups.id, old.id)).run();
  }
}

export function listBackups() {
  return db.select().from(backups).all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBackup(id: string) {
  return db.select().from(backups).where(eq(backups.id, id)).get();
}

const SCHEMA_TABLES = ["users", "settings", "bookings", "invoices", "usin_sequence"];

export function isValidSqliteBackup(filePath: string): boolean {
  try {
    const check = new Database(filePath, { readonly: true, fileMustExist: true });
    const tables = check
      .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all()
      .map((r) => (r as { name: string }).name);
    check.close();
    return SCHEMA_TABLES.every((t) => tables.includes(t));
  } catch {
    return false;
  }
}

// Swaps the live db file, then the caller must restart the process (see
// TECHNICAL_SPEC.md §10: "stop writes, swap, restart") — the Windows service
// wrapper brings it back up against the restored file.
export function restoreFrom(uploadedPath: string): void {
  sqlite.close();
  fs.copyFileSync(uploadedPath, config.databasePath);
}
