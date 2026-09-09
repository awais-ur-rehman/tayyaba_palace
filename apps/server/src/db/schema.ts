import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(), // always 1
  businessName: text("business_name").notNull().default(""),
  businessAddress: text("business_address").notNull().default(""),
  businessPhone: text("business_phone").notNull().default(""),
  pntn: text("pntn").notNull().default(""),
  posId: text("pos_id").notNull().default(""),
  fiscalMode: text("fiscal_mode").notNull().default("SANDBOX"), // SANDBOX | PRODUCTION
  defaultPctCode: text("default_pct_code").notNull().default(""),
  defaultTaxRate: real("default_tax_rate").notNull().default(0),
  usinPrefix: text("usin_prefix").notNull().default("TP-"),
  printerInterface: text("printer_interface").notNull().default("printer:POS-80"),
  receiptFooter: text("receipt_footer").notNull().default("Thank you for your visit"),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  category: text("category").notNull(), // FOOD | SITTING | SERVICE
  name: text("name").notNull(),
  unit: text("unit").notNull(), // PER_HEAD | PER_HOUR
  defaultPrice: integer("default_price").notNull(), // paisa
  pctCode: text("pct_code").notNull(),
  taxRate: real("tax_rate").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  bookingNo: text("booking_no").notNull().unique(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull().default(""),
  clientCnic: text("client_cnic").notNull().default(""),
  clientPntn: text("client_pntn").notNull().default(""),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull().default(""),
  guestCount: integer("guest_count").notNull(),
  paymentMode: integer("payment_mode").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | CANCELLED
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const bookingLines = sqliteTable("booking_lines", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  itemId: text("item_id").notNull(),
  itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  pctCode: text("pct_code").notNull(),
  taxRate: real("tax_rate").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // paisa
  saleValue: integer("sale_value").notNull(), // paisa
  taxCharged: integer("tax_charged").notNull(), // paisa
  totalAmount: integer("total_amount").notNull(), // paisa
  sortOrder: integer("sort_order").notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().unique(),
  usin: text("usin").notNull().unique(),
  invoiceType: integer("invoice_type").notNull().default(1), // 1 New, 2 Debit, 3 Credit
  refUsin: text("ref_usin"),
  status: text("status").notNull().default("PENDING"), // PENDING|FISCALIZED|FAILED|VOID
  fiscalInvoiceNumber: text("fiscal_invoice_number"),
  fiscalCode: text("fiscal_code"),
  totalSaleValue: integer("total_sale_value").notNull(),
  totalTaxCharged: integer("total_tax_charged").notNull(),
  totalBillAmount: integer("total_bill_amount").notNull(),
  totalQuantity: real("total_quantity").notNull(),
  requestPayload: text("request_payload"),
  responsePayload: text("response_payload"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  lastAttemptAt: text("last_attempt_at"),
  fiscalizedAt: text("fiscalized_at"),
  createdAt: text("created_at").notNull(),
});

export const usinSequence = sqliteTable("usin_sequence", {
  id: integer("id").primaryKey(), // always 1
  nextValue: integer("next_value").notNull().default(1),
});

export const printJobs = sqliteTable("print_jobs", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull(),
  kind: text("kind").notNull(), // PROVISIONAL | FISCAL | REPRINT
  status: text("status").notNull(), // OK | FAILED
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

export const backups = sqliteTable("backups", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  kind: text("kind").notNull(), // MANUAL | SCHEDULED
  checksum: text("checksum").notNull(),
  createdAt: text("created_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"), // JSON
  createdAt: text("created_at").notNull(),
});
