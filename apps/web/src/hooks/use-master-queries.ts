import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import type { BeasiswaProgram } from "@/types";

export function useBeasiswaList() {
  return useQuery({
    queryKey: queryKeys.master.beasiswa(),
    queryFn: async (): Promise<BeasiswaProgram[]> => {
      const data = await masterApi.getBeasiswaList();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useBeasiswaDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.master.beasiswaDetail(id),
    queryFn: async (): Promise<BeasiswaProgram | null> => {
      if (!id) return null;
      return await masterApi.getBeasiswaById(id);
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

// Persyaratan Hooks
export function usePersyaratanList() {
  return useQuery({
    queryKey: ["master", "persyaratan"],
    queryFn: async () => {
      const data = await masterApi.getPersyaratan();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreatePersyaratanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      beasiswaId?: string;
      namaPersyaratan: string;
      formatAllowed: string;
      maxSize: string;
      isMandatory: boolean;
    }) => {
      return await masterApi.createPersyaratan(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master", "persyaratan"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.master.beasiswa() });
    },
  });
}

export function useDeletePersyaratanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await masterApi.deletePersyaratan(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master", "persyaratan"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.master.beasiswa() });
    },
  });
}
