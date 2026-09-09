import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { invoices } from "../db/schema.js";
import { attemptFiscalize } from "../modules/invoices/service.js";

const POLL_MS = 60_000;
const BACKOFF_CAP_MS = 15 * 60_000;

function backoffMs(attempts: number): number {
  return Math.min(1000 * 2 ** attempts, BACKOFF_CAP_MS);
}

let timer: NodeJS.Timeout | undefined;

export function startFiscalQueue() {
  if (timer) return;
  timer = setInterval(runQueueOnce, POLL_MS);
  timer.unref();
}

export function stopFiscalQueue() {
  clearInterval(timer);
  timer = undefined;
}

export async function runQueueOnce(): Promise<{ attempted: number }> {
  const pending = db.select().from(invoices).where(eq(invoices.status, "PENDING")).all();
  const now = Date.now();

  let attempted = 0;
  for (const inv of pending) {
    const lastAttempt = inv.lastAttemptAt ? new Date(inv.lastAttemptAt).getTime() : 0;
    if (now - lastAttempt < backoffMs(inv.attempts)) continue;
    await attemptFiscalize(inv.id);
    attempted++;
  }
  return { attempted };
}
