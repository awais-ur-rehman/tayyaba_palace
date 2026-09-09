import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";

export interface PendingInvoice {
  id: string;
  usin: string;
  clientName: string;
  totalBillAmount: number;
  attempts: number;
}

export function usePendingInvoices() {
  return useQuery({
    queryKey: ["invoices-pending"],
    queryFn: () => apiGet<PendingInvoice[]>("/invoices/pending"),
    refetchInterval: 15_000,
  });
}

export function useLastSync() {
  return useQuery({
    queryKey: ["last-sync"],
    queryFn: () => apiGet<{ lastSyncAt: string | null }>("/invoices/last-sync"),
  });
}

export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ attempted: number }>("/sync"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices-pending"] });
      qc.invalidateQueries({ queryKey: ["health"] });
      qc.invalidateQueries({ queryKey: ["last-sync"] });
    },
  });
}

export interface Backup {
  id: string;
  path: string;
  sizeBytes: number;
  kind: "MANUAL" | "SCHEDULED";
  createdAt: string;
}

export function useBackups() {
  return useQuery({ queryKey: ["backups"], queryFn: () => apiGet<Backup[]>("/backups") });
}

export function useCreateBackupNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Backup>("/backup"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backups"] }),
  });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("confirm", "RESTORE");
      form.append("file", file);
      const res = await fetch("/api/backups/restore", { method: "POST", body: form, credentials: "include" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Restore failed.");
      return body as { ok: true; message: string };
    },
  });
}
