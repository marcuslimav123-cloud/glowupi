import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/utils";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

export function useApiList<T = any>(key: string, path: string, enabled = true) {
  return useQuery<T[]>({
    queryKey: [key, path],
    queryFn: () => apiFetch(path),
    enabled,
  });
}

export function useApiCreate(key: string, path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch(path, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

export function useApiUpdate(key: string, basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`${basePath}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

export function useApiDelete(key: string, basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${basePath}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}
