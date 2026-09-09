import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookingInput } from "@tayyaba/shared";
import { apiGet, apiPost, apiPatch } from "./api";

export interface Invoice {
  id: string;
  bookingId: string;
  usin: string;
  status: "PENDING" | "FISCALIZED" | "FAILED" | "VOID";
  fiscalInvoiceNumber: string | null;
  lastError: string | null;
  attempts: number;
  totalSaleValue: number;
  totalTaxCharged: number;
  totalBillAmount: number;
}

export interface BookingRow {
  id: string;
  bookingNo: string;
  clientName: string;
  clientPhone: string;
  eventDate: string;
  guestCount: number;
  status: "ACTIVE" | "CANCELLED";
  invoice: Invoice | null;
}

export interface BookingsPage {
  rows: BookingRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookingLine {
  id: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  saleValue: number;
  taxCharged: number;
  totalAmount: number;
}

export interface PrintJob {
  id: string;
  kind: string;
  status: "OK" | "FAILED";
  error: string | null;
  createdAt: string;
}

export interface BookingDetail {
  id: string;
  bookingNo: string;
  clientName: string;
  clientPhone: string;
  clientCnic: string;
  clientPntn: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  paymentMode: number;
  notes: string;
  status: "ACTIVE" | "CANCELLED";
  lines: BookingLine[];
  invoice: Invoice | null;
  prints: PrintJob[];
}

export function useBookings(params: { q?: string; from?: string; to?: string; status?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.status) search.set("status", params.status);
  if (params.page) search.set("page", String(params.page));

  return useQuery({
    queryKey: ["bookings", params],
    queryFn: () => apiGet<BookingsPage>(`/bookings?${search.toString()}`),
  });
}

export function useBooking(id: string | null) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => apiGet<BookingDetail>(`/bookings/${id}`),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookingInput) =>
      apiPost<{ booking: { id: string }; invoiceStatus: string; printOk: boolean }>("/bookings", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/bookings/${id}/cancel`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; clientPhone?: string; notes?: string }) =>
      apiPatch(`/bookings/${id}`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
  });
}

export function useRetryFiscalize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => apiPost<Invoice>(`/invoices/${invoiceId}/fiscalize`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
      qc.invalidateQueries({ queryKey: ["invoices-pending"] });
    },
  });
}

export function useReprint() {
  return useMutation({
    mutationFn: (invoiceId: string) => apiPost(`/invoices/${invoiceId}/print`),
  });
}
