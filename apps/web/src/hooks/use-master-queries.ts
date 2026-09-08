import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/lib/api";
import { appStore } from "@/lib/store";
import { queryKeys } from "@/lib/query-client";
import type { BeasiswaProgram } from "@/types";

export function useBeasiswaList() {
  return useQuery({
    queryKey: queryKeys.master.beasiswa(),
    queryFn: async (): Promise<BeasiswaProgram[]> => {
      try {
        const data = await masterApi.getBeasiswaList();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
        return appStore.getBeasiswaList();
      } catch (err) {
        console.warn("Failed to fetch beasiswa from API, falling back to local store:", err);
        return appStore.getBeasiswaList();
      }
    },
  });
}

export function useBeasiswaDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.master.beasiswaDetail(id),
    queryFn: async (): Promise<BeasiswaProgram | null> => {
      if (!id) return null;
      try {
        const data = await masterApi.getBeasiswaById(id);
        return data ?? null;
      } catch (err) {
        console.warn(`Failed to fetch beasiswa ${id} from API:`, err);
        return appStore.getBeasiswaList().find((b) => b.id === id) ?? null;
      }
    },
    enabled: Boolean(id),
  });
}

export function useCreateBeasiswaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      kodeBeasiswa?: string;
      namaPelatihan: string;
      deskripsi: string;
      kuota: number;
      metode: string;
      batasPendaftaran: string;
      tglMulaiDaftar?: string;
      tglSelesaiDaftar?: string;
    }) => {
      return await masterApi.createBeasiswa(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.master.beasiswa() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
    },
  });
}

export function useDeleteBeasiswaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await masterApi.deleteBeasiswa(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.master.beasiswa() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
    },
  });
}
