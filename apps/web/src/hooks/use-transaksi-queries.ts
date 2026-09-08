import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transaksiApi, getStoredUser } from "@/lib/api";
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
        const appRes = await transaksiApi.getMyActive();
        if (appRes && appRes.id) {
          const currentUser = getStoredUser();
          const resolvedNik =
            (appRes.biodata?.nik && appRes.biodata.nik !== "-" ? appRes.biodata.nik : "") ||
            currentUser?.nik ||
            (appRes.userId?.startsWith("user-") ? appRes.userId.replace("user-", "") : "") ||
            "-";
          const resolvedName =
            (appRes.biodata?.namaLengkap && appRes.biodata.namaLengkap !== "-" ? appRes.biodata.namaLengkap : "") ||
            currentUser?.name ||
            "-";
          const resolvedEmail =
            appRes.biodata?.email ||
            currentUser?.email ||
            "";

          const mapped: PendaftaranRecord = {
            id: appRes.id,
            kodePermohonan: appRes.kodePermohonan,
            userId: appRes.userId,
            userName: resolvedName,
            userNik: resolvedNik,
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
            biodata: appRes.biodata
              ? {
                  ...appRes.biodata,
                  nik:
                    appRes.biodata.nik && appRes.biodata.nik !== "-"
                      ? appRes.biodata.nik
                      : resolvedNik !== "-"
                      ? resolvedNik
                      : "",
                  namaLengkap:
                    appRes.biodata.namaLengkap && appRes.biodata.namaLengkap !== "-"
                      ? appRes.biodata.namaLengkap
                      : resolvedName !== "-"
                      ? resolvedName
                      : "",
                  tempatLahir: appRes.biodata.tempatLahir || "",
                  tglLahir: appRes.biodata.tglLahir || "",
                  jenisKelamin: appRes.biodata.jenisKelamin || "",
                  alamat: appRes.biodata.alamat || "",
                  provinsi: appRes.biodata.provinsi || "",
                  kabupatenKota: appRes.biodata.kabupatenKota || "",
                  kecamatan: appRes.biodata.kecamatan || "",
                  kelurahan: appRes.biodata.kelurahan || "",
                  noHp: appRes.biodata.noHp || "",
                  email: appRes.biodata.email || resolvedEmail,
                }
              : {
                  nik: resolvedNik !== "-" ? resolvedNik : "",
                  namaLengkap: resolvedName !== "-" ? resolvedName : "",
                  email: resolvedEmail,
                  tempatLahir: "",
                  tglLahir: "",
                  jenisKelamin: "" as const,
                  alamat: "",
                  provinsi: "",
                  kabupatenKota: "",
                  kecamatan: "",
                  kelurahan: "",
                  noHp: "",
                },
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
        return null;
      } catch (err: any) {
        return null;
      }
    },
    retry: false,
  });
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.transaksi.detail(id),
    queryFn: async (): Promise<PendaftaranRecord | null> => {
      if (!id) return null;
      return (await transaksiApi.getById(id)) ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useVerifikatorQueue() {
  return useQuery({
    queryKey: queryKeys.transaksi.verifikatorQueue(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      const queue = await transaksiApi.getVerifikatorQueue();
      return Array.isArray(queue) ? queue : [];
    },
  });
}

export function useWawancaraQueue() {
  return useQuery({
    queryKey: queryKeys.transaksi.wawancaraQueue(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      const queue = await transaksiApi.getWawancaraQueue();
      return Array.isArray(queue) ? queue : [];
    },
  });
}

export function useAdminStatistics() {
  return useQuery({
    queryKey: queryKeys.transaksi.adminStats(),
    queryFn: async (): Promise<any> => {
      return await transaksiApi.getStatistics();
    },
  });
}

export function useAllApplications() {
  return useQuery({
    queryKey: queryKeys.transaksi.allApplications(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      const apps = await transaksiApi.getAllApplications();
      return Array.isArray(apps) ? apps : [];
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
      return await transaksiApi.saveStep1(id, biodata);
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
      return await transaksiApi.saveStep2(id, pendidikan);
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
      return await transaksiApi.saveStep3(id, dokumen);
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
      return await transaksiApi.submit(id);
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
      return await transaksiApi.confirmDaftarUlang(id, statusKesediaan, catatan);
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
      return await transaksiApi.submitVerifikasiDecision(id, decision);
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
      return await transaksiApi.submitWawancaraScoring(id, scoring);
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
