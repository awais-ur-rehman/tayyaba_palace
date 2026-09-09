import { createBackup, listBackups } from "./service.js";

const CHECK_INTERVAL_MS = 30 * 60_000;

// ponytail: hourly poll instead of node-cron — one process, one job, no need
// for a scheduling library. Runs the 03:00 backup once whichever poll lands
// in that hour, guarded by "no scheduled backup in the last 20h".
function maybeRunDailyBackup() {
  const hour = new Date().getHours();
  if (hour !== 3) return;

  const last = listBackups().find((b) => b.kind === "SCHEDULED");
  const twentyHoursAgo = Date.now() - 20 * 60 * 60_000;
  if (last && new Date(last.createdAt).getTime() > twentyHoursAgo) return;

  createBackup("SCHEDULED");
}

export function startBackupScheduler() {
  const timer = setInterval(maybeRunDailyBackup, CHECK_INTERVAL_MS);
  timer.unref();
}
