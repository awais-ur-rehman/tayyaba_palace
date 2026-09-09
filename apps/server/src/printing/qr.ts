import QRCode from "qrcode";

export function praVerificationUrl(fiscalInvoiceNumber: string): string {
  return `https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx?PRAInvNo=${fiscalInvoiceNumber}`;
}

export async function praQrPngBuffer(fiscalInvoiceNumber: string): Promise<Buffer> {
  return QRCode.toBuffer(praVerificationUrl(fiscalInvoiceNumber), { type: "png", width: 200 });
}
