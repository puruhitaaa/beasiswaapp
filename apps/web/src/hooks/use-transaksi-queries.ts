import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, transaksiApi } from "@/lib/api";
import { appStore } from "@/lib/store";
import { queryKeys } from "@/lib/query-client";
import type {
  ApplicationStatus,
  BiodataData,
  DokumenUploadItem,
  PendaftaranRecord,
  PendidikanData,
} from "@/types";

export function useMyActiveApplication() {
  return useQuery({
    queryKey: queryKeys.transaksi.myActive(),
    queryFn: async (): Promise<PendaftaranRecord | null> => {
      try {
        await authApi.ensureSession("applicant");
        const appRes = await transaksiApi.getMyActive();
        if (appRes && appRes.id) {
          const currentUser = appStore.getCurrentUser();
          const mapped: PendaftaranRecord = {
            id: appRes.id,
            kodePermohonan: appRes.kodePermohonan,
            userId: appRes.userId,
            userName: appRes.biodata?.namaLengkap || currentUser?.name || "-",
            userNik: appRes.biodata?.nik || "-",
            beasiswaId: appRes.beasiswaId,
            beasiswaNama: appRes.beasiswaNamaSnapshot || "-",
            beasiswaMetode: "Daring",
            status: appRes.status as ApplicationStatus,
            stepWizardTerakhir: appRes.stepWizardTerakhir || 1,
            submittedAt: appRes.submittedAt
              ? new Date(appRes.submittedAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : undefined,
            tipePengajuan: appRes.status === "REVISI" ? "Hasil Revisi" : "Baru Submit",
            biodata: appRes.biodata,
            pendidikan: appRes.pendidikan,
            dokumen:
              appRes.dokumen && appRes.dokumen.length > 0
                ? appRes.dokumen
                : [
                    {
                      persyaratanId: "req-ktp",
                      namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
                      fileName: "",
                      fileSize: "",
                      mimeType: "image/jpeg",
                      format: "JPG",
                    },
                    {
                      persyaratanId: "req-kk",
                      namaPersyaratan: "KK (Kartu Keluarga)",
                      fileName: "",
                      fileSize: "",
                      mimeType: "application/pdf",
                      format: "PDF",
                    },
                    {
                      persyaratanId: "req-ijazah",
                      namaPersyaratan: "Ijazah Terakhir",
                      fileName: "",
                      fileSize: "",
                      mimeType: "application/pdf",
                      format: "PDF",
                    },
                    {
                      persyaratanId: "req-rekom",
                      namaPersyaratan: "Surat Rekomendasi / Keterangan",
                      fileName: "",
                      fileSize: "",
                      mimeType: "application/pdf",
                      format: "PDF",
                    },
                  ],
            verifikasi: appRes.verifikasi,
            wawancara: appRes.wawancara,
            daftarUlang: appRes.daftarUlang,
          };
          return mapped;
        }
        return appStore.getMyActiveApplication() ?? null;
      } catch (err) {
        console.warn("Failed to fetch my-active from API, falling back to local store:", err);
        return appStore.getMyActiveApplication() ?? null;
      }
    },
  });
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.transaksi.detail(id),
    queryFn: async (): Promise<PendaftaranRecord | null> => {
      if (!id) return null;
      try {
        const data = await transaksiApi.getById(id);
        return data ?? null;
      } catch (err) {
        console.warn(`Failed to fetch application ${id} from API:`, err);
        return appStore.getAllPendaftaran().find((p) => p.id === id) ?? null;
      }
    },
    enabled: Boolean(id),
  });
}

export function useVerifikatorQueue() {
  return useQuery({
    queryKey: queryKeys.transaksi.verifikatorQueue(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      try {
        await authApi.ensureSession("verifikator", "ahmad@beasiswa.go.id", "Ahmad Rivaldi");
        const queue = await transaksiApi.getVerifikatorQueue();
        if (Array.isArray(queue) && queue.length > 0) {
          return queue;
        }
        return appStore.getAllPendaftaran();
      } catch (err) {
        console.warn("Failed to fetch verifikator queue from API, falling back to local store:", err);
        return appStore.getAllPendaftaran();
      }
    },
  });
}

export function useWawancaraQueue() {
  return useQuery({
    queryKey: queryKeys.transaksi.wawancaraQueue(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      try {
        await authApi.ensureSession("interviewer", "interviewer@beasiswa.go.id", "Tim Penguji: Lembaga Seleksi A");
        const queue = await transaksiApi.getWawancaraQueue();
        if (Array.isArray(queue) && queue.length > 0) {
          return queue;
        }
        const all = appStore.getAllPendaftaran();
        const eligible = all.filter(
          (p) =>
            p.status === "LOLOS_ADMIN" ||
            p.status === "DALAM_PROSES_WAWANCARA" ||
            p.status === "LULUS_DITERIMA" ||
            p.status === "TIDAK_LULUS_WAWANCARA"
        );
        return eligible.length > 0 ? eligible : all;
      } catch (err) {
        console.warn("Failed to fetch wawancara queue from API, falling back to local store:", err);
        const all = appStore.getAllPendaftaran();
        const eligible = all.filter(
          (p) =>
            p.status === "LOLOS_ADMIN" ||
            p.status === "DALAM_PROSES_WAWANCARA" ||
            p.status === "LULUS_DITERIMA" ||
            p.status === "TIDAK_LULUS_WAWANCARA"
        );
        return eligible.length > 0 ? eligible : all;
      }
    },
  });
}

export function useAdminStatistics() {
  return useQuery({
    queryKey: queryKeys.transaksi.adminStats(),
    queryFn: async (): Promise<any> => {
      try {
        await authApi.ensureSession("admin", "admin@beasiswa.go.id", "Admin: Yosep Rohayadi");
        return await transaksiApi.getStatistics();
      } catch (err) {
        console.warn("Failed to fetch admin statistics from API:", err);
        return null;
      }
    },
  });
}

export function useAllApplications() {
  return useQuery({
    queryKey: queryKeys.transaksi.allApplications(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      try {
        await authApi.ensureSession("admin", "admin@beasiswa.go.id", "Admin: Yosep Rohayadi");
        const apps = await transaksiApi.getAllApplications();
        if (Array.isArray(apps) && apps.length > 0) {
          return apps;
        }
        return appStore.getAllPendaftaran();
      } catch (err) {
        console.warn("Failed to fetch all applications from API, falling back to local store:", err);
        return appStore.getAllPendaftaran();
      }
    },
  });
}

export function useInitApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      beasiswaId,
      programName,
    }: {
      beasiswaId: string;
      programName?: string;
    }) => {
      return await transaksiApi.initApplication(beasiswaId, programName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.allApplications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
    },
  });
}

export function useSaveStep1Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, biodata }: { id: string; biodata: BiodataData }) => {
      const res = await transaksiApi.saveStep1(id, biodata);
      appStore.saveStep1(id, biodata);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useSaveStep2Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pendidikan }: { id: string; pendidikan: PendidikanData }) => {
      const res = await transaksiApi.saveStep2(id, pendidikan);
      appStore.saveStep2(id, pendidikan);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useSaveStep3Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dokumen }: { id: string; dokumen: DokumenUploadItem[] }) => {
      const res = await transaksiApi.saveStep3(id, dokumen);
      appStore.saveStep3(id, dokumen);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useSubmitApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await transaksiApi.submit(id);
      appStore.submitApplication(id);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.allApplications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.verifikatorQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
    },
  });
}

export function useConfirmDaftarUlangMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      statusKesediaan,
      catatan,
    }: {
      id: string;
      statusKesediaan: "bersedia" | "mengundurkan";
      catatan?: string;
    }) => {
      const res = await transaksiApi.confirmDaftarUlang(id, statusKesediaan, catatan);
      appStore.confirmDaftarUlang(id, statusKesediaan, catatan);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.allApplications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
    },
  });
}

export function useSubmitVerifikasiMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      decision,
    }: {
      id: string;
      decision: {
        statusKeputusan: "disetujui" | "revisi" | "ditolak";
        catatanRevisi?: string;
        catatanVerifikator?: string;
        checklistKtp?: boolean;
        checklistKk?: boolean;
        checklistIjazah?: boolean;
        checklistRekomendasi?: boolean;
      };
    }) => {
      const res = await transaksiApi.submitVerifikasiDecision(id, decision);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.verifikatorQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.allApplications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.wawancaraQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useSubmitWawancaraMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      scoring,
    }: {
      id: string;
      scoring: {
        skorKomunikasi?: number;
        skorTeknis?: number;
        skorKomitmen?: number;
        nilaiWawancara?: number;
        catatanEvaluasi: string;
        statusHasil: "Lulus" | "Tidak Lulus";
      };
    }) => {
      const res = await transaksiApi.submitWawancaraScoring(id, scoring);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.wawancaraQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.allApplications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.adminStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useExportExcelMutation() {
  return useMutation({
    mutationFn: async () => {
      return await transaksiApi.exportExcel();
    },
  });
}
