export interface FiscalInvoiceItem {
  itemCode: string;
  itemName: string;
  pctCode: string;
  quantity: number;
  taxRate: number;
  saleValue: number; // rupees, decimal string-safe number
  taxCharged: number;
  totalAmount: number;
}

export interface FiscalInvoice {
  usin: string;
  posId: string;
  dateTime: string; // YYYY-MM-DD HH:mm:ss
  buyerName?: string;
  buyerPntn?: string;
  buyerCnic?: string;
  buyerPhoneNumber?: string;
  totalSaleValue: number;
  totalTaxCharged: number;
  totalBillAmount: number;
  totalQuantity: number;
  paymentMode: number;
  items: FiscalInvoiceItem[];
}

export interface FiscalResult {
  ok: boolean;
  invoiceNumber?: string;
  code?: string;
  message?: string;
  raw: unknown;
}

export interface FiscalAdapter {
  health(): Promise<boolean>;
  fiscalize(invoice: FiscalInvoice): Promise<FiscalResult>;
}
