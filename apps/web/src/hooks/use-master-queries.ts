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
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // fallback to store
      }
      return appStore.getPrograms();
    },
  });
}

export function useBeasiswaDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.master.beasiswaDetail(id),
    queryFn: async (): Promise<BeasiswaProgram | null> => {
      if (!id) return null;
      try {
        return await masterApi.getBeasiswaById(id);
      } catch {
        return appStore.getProgramById(id) || null;
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
      try {
        return await masterApi.createBeasiswa(payload);
      } catch {
        return appStore.addBeasiswa({
          kodeBeasiswa: payload.kodeBeasiswa || `BSW-${Date.now().toString().slice(-4)}`,
          namaPelatihan: payload.namaPelatihan,
          deskripsi: payload.deskripsi,
          kuota: payload.kuota,
          metode: payload.metode,
          batasPendaftaran: payload.batasPendaftaran,
          status: "buka",
          isActive: true,
          persyaratanKhusus: [],
          dokumenWajib: ["Scan KTP & KK", "Ijazah Terakhir"],
        });
      }
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
      try {
        return await masterApi.deleteBeasiswa(id);
      } catch {
        appStore.deleteBeasiswa(id);
        return { success: true };
      }
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
      try {
        const data = await masterApi.getPersyaratan();
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // fallback
      }
      return appStore.getPersyaratan();
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
      try {
        return await masterApi.createPersyaratan(data);
      } catch {
        return appStore.addPersyaratan(data);
      }
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
      try {
        return await masterApi.deletePersyaratan(id);
      } catch {
        appStore.deletePersyaratan(id);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master", "persyaratan"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.master.beasiswa() });
    },
  });
}
