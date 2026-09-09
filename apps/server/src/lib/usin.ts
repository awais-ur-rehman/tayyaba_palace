import type Database from "better-sqlite3";

// Must be called inside the same transaction that inserts the invoice row,
// so a rollback also rolls back the sequence bump. See TECHNICAL_SPEC.md §6.
export function allocateUsin(sqlite: Database.Database, prefix: string): string {
  const row = sqlite
    .prepare(`SELECT next_value FROM usin_sequence WHERE id = 1`)
    .get() as { next_value: number };
  const value = row.next_value;
  sqlite.prepare(`UPDATE usin_sequence SET next_value = ? WHERE id = 1`).run(value + 1);
  return `${prefix}${String(value).padStart(6, "0")}`;
}

export function allocateBookingNo(sqlite: Database.Database): string {
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS n FROM bookings`)
    .get() as { n: number };
  return `B-${String(row.n + 1).padStart(5, "0")}`;
}
