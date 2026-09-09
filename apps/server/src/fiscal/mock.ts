import type { FiscalAdapter, FiscalInvoice, FiscalResult } from "./adapter.js";

// Deterministic fake for dev/tests on machines without the PRA POS Component
// (see PRA_INTEGRATION.md §11). Always succeeds unless the USIN contains "FAIL".
export class MockAdapter implements FiscalAdapter {
  async health(): Promise<boolean> {
    return true;
  }

  async fiscalize(invoice: FiscalInvoice): Promise<FiscalResult> {
    await new Promise((r) => setTimeout(r, 150));

    if (invoice.usin.includes("FAIL")) {
      return {
        ok: false,
        code: "999",
        message: "Simulated failure (USIN contains FAIL)",
        raw: { simulated: true },
      };
    }

    const invoiceNumber = `9${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return {
      ok: true,
      invoiceNumber,
      code: "100",
      message: "Fiscal Invoice Number generated successfully.",
      raw: { InvoiceNumber: invoiceNumber, Code: "100", simulated: true },
    };
  }
}
