import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databasePath: path.resolve(required("DATABASE_PATH", "./data/app.db")),
  backupDir: path.resolve(required("BACKUP_DIR", "./backups")),
  logDir: path.resolve(required("LOG_DIR", "./logs")),
  sessionSecret: required("SESSION_SECRET", "dev-only-secret-change-me-1234567890"),
  seedAdminEmail: required("SEED_ADMIN_EMAIL", "admin@tayyabapalace.com"),
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD,
  fiscalAdapter: (process.env.FISCAL_ADAPTER ?? "mock") as "local" | "cloud" | "mock",
  fiscalLocalUrl: required("FISCAL_LOCAL_URL", "http://localhost:8524"),
  fiscalTimeoutMs: Number(process.env.FISCAL_TIMEOUT_MS ?? 2000),
  printerInterface: process.env.PRINTER_INTERFACE ?? "printer:POS-80",
  isProduction: process.env.NODE_ENV === "production",
};
