import { z } from "zod";
import {
  StatusPendaftaran,
  StatusVerifikasi,
  StatusWawancara,
} from "../enums/index.js";
import {
  step1BiodataSchema,
  step2PendidikanSchema,
  step3DokumenItemSchema,
} from "./wizard.js";

export const pendaftaranSummarySchema = z.object({
  id: z.string(),
  kodePermohonan: z.string(),
  userId: z.string(),
  beasiswaId: z.string(),
  beasiswaNamaSnapshot: z.string().optional().nullable(),
  status: z.enum([
    StatusPendaftaran.DRAFT,
    StatusPendaftaran.SUBMITTED,
    StatusPendaftaran.DALAM_PROSES_ADMIN,
    StatusPendaftaran.REVISI,
    StatusPendaftaran.TIDAK_LOLOS_ADMIN,
    StatusPendaftaran.LOLOS_ADMIN,
    StatusPendaftaran.DALAM_PROSES_WAWANCARA,
    StatusPendaftaran.TIDAK_LULUS_WAWANCARA,
    StatusPendaftaran.LULUS_DITERIMA,
  ]),
  stepWizardTerakhir: z.number().int().min(1).max(4),
  submittedAt: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PendaftaranSummary = z.infer<typeof pendaftaranSummarySchema>;

export const pendaftaranDetailSchema = pendaftaranSummarySchema.extend({
  biodata: step1BiodataSchema.optional().nullable(),
  pendidikan: step2PendidikanSchema.optional().nullable(),
  dokumen: z.array(step3DokumenItemSchema).optional(),
});

export type PendaftaranDetail = z.infer<typeof pendaftaranDetailSchema>;

export const verifikasiAdminInputSchema = z.object({
  checklistKtp: z.boolean(),
  checklistKk: z.boolean(),
  checklistIjazah: z.boolean(),
  checklistRekomendasi: z.boolean(),
  catatanRevisi: z.string().optional().nullable(),
  statusKeputusan: z.enum([
    StatusVerifikasi.DITERIMA,
    StatusVerifikasi.DITOLAK,
    StatusVerifikasi.PERLU_REVISI,
  ]),
});

export type VerifikasiAdminInput = z.infer<typeof verifikasiAdminInputSchema>;

export const penilaianWawancaraInputSchema = z.object({
  nilaiWawancara: z.number().min(0).max(100),
  catatanEvaluasi: z.string().min(5),
  statusHasil: z.enum([StatusWawancara.LULUS, StatusWawancara.TIDAK_LULUS]),
});

export type PenilaianWawancaraInput = z.infer<
  typeof penilaianWawancaraInputSchema
>;

export const daftarUlangSchema = z.object({
  statusKesediaan: z.enum(["bersedia", "mengundurkan"]),
  catatan: z.string().optional(),
});

export type DaftarUlangInput = z.infer<typeof daftarUlangSchema>;

