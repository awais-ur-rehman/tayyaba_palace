import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { praQrPngBuffer } from "./qr.js";
import { renderReceiptText, type ReceiptData } from "./receipt.js";

export interface PrintResult {
  ok: boolean;
  error?: string;
}

// Real ESC/POS path — wired per TECHNICAL_SPEC.md §8 but unverified until run
// on the venue laptop against the actual USB printer. On this dev machine the
// printer connection will fail; we log the receipt text so the flow is still
// visible, and report the failure like any other print_job so callers behave
// exactly as they will in production (never fatal, always offer reprint).
export async function printReceipt(receipt: ReceiptData): Promise<PrintResult> {
  const text = renderReceiptText(receipt);
  logger.info({ usin: receipt.usin }, "receipt render");
  console.log("\n" + text + "\n");

  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: config.printerInterface,
    });

    const connected = await printer.isPrinterConnected().catch(() => false);
    if (!connected) throw new Error(`Printer not reachable at ${config.printerInterface}`);

    printer.alignCenter();
    printer.bold(true);
    printer.println(receipt.businessName);
    printer.bold(false);
    for (const line of text.split("\n").slice(1)) {
      printer.println(line);
    }

    if (receipt.fiscalInvoiceNumber) {
      const qr = await praQrPngBuffer(receipt.fiscalInvoiceNumber);
      await printer.printImageBuffer(qr);
    }

    printer.cut();
    await printer.execute();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown printer error";
    logger.warn({ usin: receipt.usin, error: message }, "print failed");
    return { ok: false, error: message };
  }
}

export async function isPrinterReachable(): Promise<boolean> {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: config.printerInterface,
    });
    return await printer.isPrinterConnected();
  } catch {
    return false;
  }
}
