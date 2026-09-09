import { toRupees, type Paisa } from "../lib/money.js";
import { PAYMENT_MODES, type PaymentMode } from "@tayyaba/shared";
import { praVerificationUrl } from "./qr.js";

export interface ReceiptLine {
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: Paisa;
  saleValue: Paisa; // tax-exclusive — what the "Amount" column shows
}

export interface ReceiptData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  pntn: string;
  usin: string;
  fiscalInvoiceNumber: string | null; // null → PENDING
  dateTimeIso: string;
  clientName: string;
  clientPhone: string;
  eventDate: string;
  guestCount: number;
  lines: ReceiptLine[];
  totalSaleValue: Paisa;
  totalTaxCharged: Paisa;
  totalBillAmount: Paisa;
  paymentMode: number;
  receiptFooter: string;
}

const RULE = "-".repeat(32);

// Plain-text ESC/POS-adjacent layout, matches TECHNICAL_SPEC.md §8.
// This is what gets sent to node-thermal-printer's `println` calls one-for-one.
export function renderReceiptText(r: ReceiptData): string {
  const lines: string[] = [];
  lines.push(r.businessName);
  if (r.businessAddress) lines.push(r.businessAddress);
  if (r.businessPhone) lines.push(r.businessPhone);
  if (r.pntn) lines.push(`PNTN: ${r.pntn}`);
  lines.push(RULE);
  lines.push(`Invoice: ${r.usin}`);
  lines.push(`PRA Invoice: ${r.fiscalInvoiceNumber ?? "PENDING"}`);
  lines.push(`Date: ${r.dateTimeIso}`);
  lines.push(`Client: ${r.clientName}${r.clientPhone ? " · " + r.clientPhone : ""}`);
  lines.push(`Event date: ${r.eventDate}`);
  lines.push(`Guests: ${r.guestCount}`);
  lines.push(RULE);

  const byCategory = new Map<string, ReceiptLine[]>();
  for (const l of r.lines) {
    if (!byCategory.has(l.category)) byCategory.set(l.category, []);
    byCategory.get(l.category)!.push(l);
  }
  for (const [category, catLines] of byCategory) {
    lines.push(category);
    for (const l of catLines) {
      lines.push(
        `  ${l.itemName.slice(0, 20).padEnd(20)} ${String(l.quantity).padStart(4)} ${toRupees(
          l.saleValue
        ).padStart(10)}`
      );
    }
  }
  lines.push(RULE);
  lines.push(`Sale value`.padEnd(24) + toRupees(r.totalSaleValue).padStart(8));
  lines.push(`Sales tax`.padEnd(24) + toRupees(r.totalTaxCharged).padStart(8));
  lines.push(`TOTAL`.padEnd(24) + toRupees(r.totalBillAmount).padStart(8));
  lines.push(`Payment: ${PAYMENT_MODES[r.paymentMode as PaymentMode] ?? r.paymentMode}`);
  lines.push(RULE);

  if (r.fiscalInvoiceNumber) {
    lines.push(`[QR] ${praVerificationUrl(r.fiscalInvoiceNumber)}`);
    lines.push(`Verify: reg.pra.punjab.gov.pk`);
  } else {
    lines.push(`*** FISCAL NUMBER PENDING ***`);
  }
  if (r.receiptFooter) lines.push(r.receiptFooter);

  return lines.join("\n");
}
