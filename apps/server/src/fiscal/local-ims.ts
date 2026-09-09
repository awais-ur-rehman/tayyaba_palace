import { config } from "../config.js";
import type { FiscalAdapter, FiscalInvoice, FiscalResult } from "./adapter.js";
import { toPraPayload } from "./mapper.js";

// Posts to the PRA POS Component running on the same Windows box
// (localhost:8524, no auth — see PRA_INTEGRATION.md §3).
// Untestable on macOS dev machine; verify on the venue laptop before go-live.
export class LocalImsAdapter implements FiscalAdapter {
  constructor(private readonly baseUrl: string = config.fiscalLocalUrl) {}

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/IMSFiscal/Get`, {
        signal: AbortSignal.timeout(config.fiscalTimeoutMs),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as unknown;
      return Array.isArray(body) && body[0] === "Service is responding";
    } catch {
      return false;
    }
  }

  async fiscalize(invoice: FiscalInvoice): Promise<FiscalResult> {
    const payload = toPraPayload(invoice);
    try {
      const res = await fetch(`${this.baseUrl}/api/IMSFiscal/GetInvoiceNumberByModel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.fiscalTimeoutMs),
      });

      const raw = await res.json().catch(() => null);
      if (!res.ok || !raw) {
        return { ok: false, message: `HTTP ${res.status}`, raw };
      }

      const body = raw as { InvoiceNumber?: string; Code?: string; Response?: string };
      if (body.Code === "100" && body.InvoiceNumber) {
        return { ok: true, invoiceNumber: body.InvoiceNumber, code: body.Code, raw };
      }
      return { ok: false, code: body.Code, message: body.Response ?? "Fiscalisation rejected", raw };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
        raw: null,
      };
    }
  }
}
