import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transaksiApi, dokumenApi, getStoredUser } from "@/lib/api";
import { appStore } from "@/lib/store";
import { queryKeys } from "@/lib/query-client";
import type {
  ApplicationStatus,
  BiodataData,
  DokumenUploadItem,
  PendaftaranRecord,
  PendidikanData,
} from "@/types";

export const DEFAULT_DOKUMEN_REQUIREMENTS: DokumenUploadItem[] = [
  {
    persyaratanId: "req-ktp",
    namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
    fileName: "",
    fileSize: "",
    mimeType: "image/jpeg",
    format: "JPG",
    isSesuai: true,
    isRejected: false,
  },
  {
    persyaratanId: "req-kk",
    namaPersyaratan: "KK (Kartu Keluarga)",
    fileName: "",
    fileSize: "",
    mimeType: "application/pdf",
    format: "PDF",
    isSesuai: true,
    isRejected: false,
  },
  {
    persyaratanId: "req-ijazah",
    namaPersyaratan: "Ijazah Terakhir",
    fileName: "",
    fileSize: "",
    mimeType: "application/pdf",
    format: "PDF",
    isSesuai: true,
    isRejected: false,
  },
  {
    persyaratanId: "req-rekom",
    namaPersyaratan: "Surat Rekomendasi / Keterangan",
    fileName: "",
    fileSize: "",
    mimeType: "application/pdf",
    format: "PDF",
    isSesuai: true,
    isRejected: false,
  },
];

export function mergeWithDefaultDocuments(serverDocs: any[] = []): DokumenUploadItem[] {
  const docs = Array.isArray(serverDocs) ? serverDocs : [];
  return DEFAULT_DOKUMEN_REQUIREMENTS.map((req) => {
    const existing = docs.find((d: any) => d.persyaratanId === req.persyaratanId);
    if (existing) {
      const docId = existing.dokumenId || existing.id;
      return {
        ...req,
        ...existing,
        id: docId || req.id,
        dokumenId: docId,
        fileName: existing.fileName || "",
        fileSize: existing.fileSize || "",
        mimeType: existing.mimeType || req.mimeType,
        format: existing.format || req.format,
        fileUrl: existing.fileUrl || (docId ? dokumenApi.getViewUrl(docId) : undefined),
        isSesuai: existing.isSesuai !== undefined ? existing.isSesuai : true,
        isRejected: existing.isRejected !== undefined ? existing.isRejected : false,
        catatanRevisi: existing.catatanRevisi || undefined,
      };
    }
    return req;
  });
}

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
            dokumen: mergeWithDefaultDocuments(appRes.dokumen),
            verifikasi: appRes.verifikasi,
            wawancara: appRes.wawancara,
            daftarUlang: appRes.daftarUlang,
          };
          return mapped;
        }
        return appStore.getMyActiveApplication() || null;
      } catch (err: any) {
        return appStore.getMyActiveApplication() || null;
      }
    },
    retry: false,
  });
}

function mapPendaftaranQueueItem(item: any): PendaftaranRecord {
  const userName = item.biodata?.namaLengkap || item.userName || "-";
  const userNik = item.biodata?.nik || item.userNik || "-";
  const beasiswaNama = item.beasiswaNama || item.beasiswaNamaSnapshot || "-";
  return {
    ...item,
    userName,
    userNik,
    beasiswaNama,
    beasiswaMetode: item.beasiswaMetode || "Daring",
    tipePengajuan: item.tipePengajuan || (item.status === "REVISI" ? "Hasil Revisi" : "Baru Submit"),
    dokumen: mergeWithDefaultDocuments(item.dokumen),
    submittedAt: item.submittedAt
      ? new Date(item.submittedAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : item.submittedAt || undefined,
  };
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.transaksi.detail(id),
    queryFn: async (): Promise<PendaftaranRecord | null> => {
      if (!id) return null;
      const res = await transaksiApi.getById(id);
      return res ? mapPendaftaranQueueItem(res) : null;
    },
    enabled: Boolean(id),
  });
}

export function useVerifikatorQueue() {
  return useQuery({
    queryKey: queryKeys.transaksi.verifikatorQueue(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      try {
        const queue = await transaksiApi.getVerifikatorQueue();
        if (Array.isArray(queue) && queue.length > 0) return queue.map(mapPendaftaranQueueItem);
      } catch {
        // fallback
      }
      return appStore.getVerifikatorQueue();
    },
  });
}

export function useWawancaraQueue() {
  return useQuery({
    queryKey: queryKeys.transaksi.wawancaraQueue(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      try {
        const queue = await transaksiApi.getWawancaraQueue();
        if (Array.isArray(queue) && queue.length > 0) return queue.map(mapPendaftaranQueueItem);
      } catch {
        // fallback
      }
      return appStore.getWawancaraQueue();
    },
  });
}

export function useAdminStatistics() {
  return useQuery({
    queryKey: queryKeys.transaksi.adminStats(),
    queryFn: async (): Promise<any> => {
      try {
        const stats = await transaksiApi.getStatistics();
        if (stats) return stats;
      } catch {
        // fallback
      }
      return appStore.getStatistics();
    },
  });
}

export function useAllApplications() {
  return useQuery({
    queryKey: queryKeys.transaksi.allApplications(),
    queryFn: async (): Promise<PendaftaranRecord[]> => {
      try {
        const apps = await transaksiApi.getAllApplications();
        if (Array.isArray(apps) && apps.length > 0) return apps.map(mapPendaftaranQueueItem);
      } catch {
        // fallback
      }
      return appStore.getAllApplications();
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
      try {
        return await transaksiApi.initApplication(beasiswaId, programName);
      } catch (err) {
        return appStore.initApplication(beasiswaId, programName || "Pelatihan");
      }
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
      try {
        return await transaksiApi.saveStep1(id, biodata);
      } catch {
        return appStore.saveStep1(id, biodata);
      }
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
      try {
        return await transaksiApi.saveStep2(id, pendidikan);
      } catch {
        return appStore.saveStep2(id, pendidikan);
      }
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
      try {
        return await transaksiApi.saveStep3(id, dokumen);
      } catch {
        return appStore.saveStep3(id, dokumen);
      }
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
      try {
        return await transaksiApi.submit(id);
      } catch {
        return appStore.submitApplication(id);
      }
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
      try {
        return await transaksiApi.confirmDaftarUlang(id, statusKesediaan, catatan);
      } catch {
        return appStore.confirmDaftarUlang(id, statusKesediaan, catatan);
      }
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
      try {
        return await transaksiApi.submitVerifikasiDecision(id, decision);
      } catch {
        return appStore.submitVerifikasiDecision(
          id,
          decision.statusKeputusan,
          decision.catatanRevisi || decision.catatanVerifikator || "",
          [
            { persyaratanId: "req-ktp", isSesuai: decision.checklistKtp ?? true },
            { persyaratanId: "req-kk", isSesuai: decision.checklistKk ?? true },
            { persyaratanId: "req-ijazah", isSesuai: decision.checklistIjazah ?? true },
            { persyaratanId: "req-rekom", isSesuai: decision.checklistRekomendasi ?? true },
          ]
        );
      }
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
      try {
        return await transaksiApi.submitWawancaraScoring(id, scoring);
      } catch {
        return appStore.submitWawancaraPenilaian(
          id,
          scoring.skorKomunikasi || 80,
          scoring.skorTeknis || 80,
          scoring.skorKomitmen || 80,
          scoring.statusHasil,
          scoring.catatanEvaluasi
        );
      }
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
      try {
        return await transaksiApi.exportExcel();
      } catch {
        const list = appStore.getAllApplications();
        const headers = [
          "No",
          "NIK",
          "Nama Peserta",
          "Program Pelatihan",
          "Status Administrasi",
          "Nilai Wawancara",
          "Status Wawancara",
          "Status Final",
        ];

        const rows = list.map((p, idx) => [
          idx + 1,
          `'${p.biodata?.nik || p.userNik}`,
          p.biodata?.namaLengkap || p.userName,
          p.beasiswaNama,
          p.status === "LOLOS_ADMIN" ||
          p.status === "DALAM_PROSES_WAWANCARA" ||
          p.status === "LULUS_DITERIMA"
            ? "Lolos"
            : p.status === "TIDAK_LOLOS_ADMIN"
            ? "Tidak Lolos"
            : "Dalam Proses",
          p.wawancara?.nilaiWawancara ? p.wawancara.nilaiWawancara.toFixed(2) : "-",
          p.wawancara?.statusHasil || "-",
          p.status === "LULUS_DITERIMA" ? "DITERIMA" : p.status,
        ]);

        const csvContent =
          "\uFEFF" +
          [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\r\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Rekap_Hasil_Seleksi_Beasiswa_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
  });
}
