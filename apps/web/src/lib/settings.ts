import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SettingsInput } from "@tayyaba/shared";
import { apiGet, apiPatch } from "./api";

export interface Settings extends SettingsInput {
  id: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SettingsInput>) => apiPatch<Settings>("/settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
