import { z } from "zod";

export const CATEGORIES = ["FOOD", "SITTING", "SERVICE"] as const;
export type Category = (typeof CATEGORIES)[number];

export const UNITS = ["PER_HEAD", "PER_HOUR"] as const;
export type Unit = (typeof UNITS)[number];

export const unitForCategory = (category: Category): Unit =>
  category === "SERVICE" ? "PER_HOUR" : "PER_HEAD";

export const PAYMENT_MODES = {
  1: "Cash",
  2: "Card",
  3: "Gift Voucher",
  4: "Loyalty Card",
  5: "Mixed",
  6: "Cheque",
} as const;
export type PaymentMode = keyof typeof PAYMENT_MODES;

export const BOOKING_STATUSES = ["ACTIVE", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const INVOICE_STATUSES = ["PENDING", "FISCALIZED", "FAILED", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// ---- Inventory ----

export const inventoryItemSchema = z.object({
  code: z.string().min(1).max(50),
  category: z.enum(CATEGORIES),
  name: z.string().min(1).max(150),
  defaultPrice: z.number().int().min(0), // paisa
  pctCode: z.string().length(8),
  taxRate: z.number().min(0).max(100),
  active: z.boolean().default(true),
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

// ---- Bookings ----

export const bookingLineInputSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().int().min(0), // paisa, editable override
  manuallyEdited: z.boolean().default(false),
});
export type BookingLineInput = z.infer<typeof bookingLineInputSchema>;

export const bookingInputSchema = z.object({
  clientName: z.string().min(1).max(150),
  clientPhone: z
    .string()
    .regex(/^[\d\s+]*$/)
    .optional()
    .or(z.literal("")),
  clientCnic: z
    .string()
    .regex(/^\d{13}$/)
    .optional()
    .or(z.literal("")),
  clientPntn: z
    .string()
    .regex(/^\d{7}-\d$/)
    .optional()
    .or(z.literal("")),
  eventDate: z.string().min(1),
  eventTime: z.string().optional().or(z.literal("")),
  guestCount: z.number().int().min(1),
  paymentMode: z.number().int().min(1).max(6),
  notes: z.string().optional().or(z.literal("")),
  lines: z.array(bookingLineInputSchema).min(1),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---- Settings ----

export const settingsSchema = z.object({
  businessName: z.string().min(1),
  businessAddress: z.string().optional().or(z.literal("")),
  businessPhone: z.string().optional().or(z.literal("")),
  pntn: z.string().optional().or(z.literal("")),
  posId: z.string().optional().or(z.literal("")),
  fiscalMode: z.enum(["SANDBOX", "PRODUCTION"]),
  defaultPctCode: z.string().length(8),
  defaultTaxRate: z.number().min(0).max(100),
  usinPrefix: z.string().min(1),
  printerInterface: z.string().optional().or(z.literal("")),
  receiptFooter: z.string().optional().or(z.literal("")),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
