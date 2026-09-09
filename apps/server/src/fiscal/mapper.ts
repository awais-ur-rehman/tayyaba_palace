import { toRupees, type Paisa } from "../lib/money.js";
import type { FiscalInvoice, FiscalInvoiceItem } from "./adapter.js";

export interface BookingLineForFiscal {
  itemCode: string;
  itemName: string;
  pctCode: string;
  taxRate: number;
  quantity: number;
  saleValue: Paisa;
  taxCharged: Paisa;
  totalAmount: Paisa;
}

export interface BookingForFiscal {
  usin: string;
  posId: string;
  dateTimeIso: string;
  clientName: string;
  clientPntn?: string;
  clientCnic?: string;
  clientPhone?: string;
  paymentMode: number;
  totalSaleValue: Paisa;
  totalTaxCharged: Paisa;
  totalBillAmount: Paisa;
  totalQuantity: number;
  lines: BookingLineForFiscal[];
}

function toWireDateTime(iso: string): string {
  // "YYYY-MM-DD HH:mm:ss" per PRA_INTEGRATION.md §4
  return iso.replace("T", " ").slice(0, 19);
}

export function toFiscalInvoice(b: BookingForFiscal): FiscalInvoice {
  const items: FiscalInvoiceItem[] = b.lines.map((l) => ({
    itemCode: l.itemCode,
    itemName: l.itemName,
    pctCode: l.pctCode,
    quantity: l.quantity,
    taxRate: l.taxRate,
    saleValue: Number(toRupees(l.saleValue)),
    taxCharged: Number(toRupees(l.taxCharged)),
    totalAmount: Number(toRupees(l.totalAmount)),
  }));

  return {
    usin: b.usin,
    posId: b.posId,
    dateTime: toWireDateTime(b.dateTimeIso),
    buyerName: b.clientName || undefined,
    buyerPntn: b.clientPntn || undefined,
    buyerCnic: b.clientCnic || undefined,
    buyerPhoneNumber: b.clientPhone || undefined,
    totalSaleValue: Number(toRupees(b.totalSaleValue)),
    totalTaxCharged: Number(toRupees(b.totalTaxCharged)),
    totalBillAmount: Number(toRupees(b.totalBillAmount)),
    totalQuantity: b.totalQuantity,
    paymentMode: b.paymentMode,
    items,
  };
}

// Exact wire shape PRA expects — field names are case-sensitive (PRA_INTEGRATION.md §4).
export function toPraPayload(invoice: FiscalInvoice) {
  return {
    InvoiceNumber: "",
    POSID: Number(invoice.posId),
    USIN: invoice.usin,
    DateTime: invoice.dateTime,
    BuyerName: invoice.buyerName ?? null,
    BuyerPNTN: invoice.buyerPntn ?? null,
    BuyerCNIC: invoice.buyerCnic ?? null,
    BuyerPhoneNumber: invoice.buyerPhoneNumber ?? null,
    TotalBillAmount: invoice.totalBillAmount,
    TotalQuantity: invoice.totalQuantity,
    TotalSaleValue: invoice.totalSaleValue,
    TotalTaxCharged: invoice.totalTaxCharged,
    Discount: 0.0,
    FurtherTax: 0.0,
    PaymentMode: invoice.paymentMode,
    RefUSIN: null,
    InvoiceType: 1,
    Items: invoice.items.map((i) => ({
      ItemCode: i.itemCode,
      ItemName: i.itemName,
      Quantity: i.quantity,
      PCTCode: i.pctCode,
      TaxRate: i.taxRate,
      SaleValue: i.saleValue,
      TotalAmount: i.totalAmount,
      TaxCharged: i.taxCharged,
      Discount: 0.0,
      FurtherTax: 0.0,
      InvoiceType: 1,
      RefUSIN: null,
    })),
  };
}
