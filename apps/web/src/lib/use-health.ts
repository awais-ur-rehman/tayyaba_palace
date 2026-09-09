import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";

export interface Health {
  db: boolean;
  fiscal: boolean;
  pendingInvoices: number;
  printer: boolean;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<Health>("/health"),
    refetchInterval: 30_000,
  });
}
