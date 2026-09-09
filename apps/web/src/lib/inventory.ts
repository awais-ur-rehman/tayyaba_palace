import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InventoryItemInput, Category } from "@tayyaba/shared";
import { apiGet, apiPost, apiPatch } from "./api";

export interface InventoryItem {
  id: string;
  code: string;
  category: Category;
  name: string;
  unit: "PER_HEAD" | "PER_HOUR";
  defaultPrice: number;
  pctCode: string;
  taxRate: number;
  active: number;
}

export function useInventory(params: { category?: Category; active?: boolean } = {}) {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.active !== undefined) search.set("active", String(params.active));

  return useQuery({
    queryKey: ["inventory", params],
    queryFn: () => apiGet<InventoryItem[]>(`/inventory?${search.toString()}`),
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InventoryItemInput) => apiPost<InventoryItem>("/inventory", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InventoryItemInput> & { id: string }) =>
      apiPatch<InventoryItem>(`/inventory/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useArchiveInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/inventory/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
