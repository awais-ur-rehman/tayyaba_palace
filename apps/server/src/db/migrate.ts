import { sqlite } from "./index.js";

// ponytail: raw idempotent DDL instead of drizzle-kit migration files.
// Single-tenant app with no migration history to replay yet; add drizzle-kit
// when a real schema change needs to run against existing venue data.
const ddl = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  business_address TEXT NOT NULL DEFAULT '',
  business_phone TEXT NOT NULL DEFAULT '',
  pntn TEXT NOT NULL DEFAULT '',
  pos_id TEXT NOT NULL DEFAULT '',
  fiscal_mode TEXT NOT NULL DEFAULT 'SANDBOX',
  default_pct_code TEXT NOT NULL DEFAULT '',
  default_tax_rate REAL NOT NULL DEFAULT 0,
  usin_prefix TEXT NOT NULL DEFAULT 'TP-',
  printer_interface TEXT NOT NULL DEFAULT 'printer:POS-80',
  receipt_footer TEXT NOT NULL DEFAULT 'Thank you for your visit'
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  default_price INTEGER NOT NULL,
  pct_code TEXT NOT NULL,
  tax_rate REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_no TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  client_cnic TEXT NOT NULL DEFAULT '',
  client_pntn TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL DEFAULT '',
  guest_count INTEGER NOT NULL,
  payment_mode INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_lines (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  pct_code TEXT NOT NULL,
  tax_rate REAL NOT NULL,
  quantity REAL NOT NULL,
  unit_price INTEGER NOT NULL,
  sale_value INTEGER NOT NULL,
  tax_charged INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_lines_booking_id ON booking_lines(booking_id);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  usin TEXT NOT NULL UNIQUE,
  invoice_type INTEGER NOT NULL DEFAULT 1,
  ref_usin TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  fiscal_invoice_number TEXT,
  fiscal_code TEXT,
  total_sale_value INTEGER NOT NULL,
  total_tax_charged INTEGER NOT NULL,
  total_bill_amount INTEGER NOT NULL,
  total_quantity REAL NOT NULL,
  request_payload TEXT,
  response_payload TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_attempt_at TEXT,
  fiscalized_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS usin_sequence (
  id INTEGER PRIMARY KEY,
  next_value INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  kind TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
`;

export function runMigrations() {
  sqlite.exec(ddl);
  sqlite
    .prepare(`INSERT OR IGNORE INTO usin_sequence (id, next_value) VALUES (1, 1)`)
    .run();
  sqlite
    .prepare(`INSERT OR IGNORE INTO settings (id) VALUES (1)`)
    .run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
  console.log("Migrations applied.");
}
