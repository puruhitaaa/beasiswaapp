import { z } from "zod";

export const step1BiodataSchema = z.object({
  nik: z
    .string()
    .length(16, "NIK harus terdiri dari 16 digit angka")
    .regex(/^\d{16}$/, "NIK hanya boleh berisi angka"),
  namaLengkap: z
    .string()
    .min(3, "Nama lengkap minimal 3 karakter")
    .max(255, "Nama lengkap maksimal 255 karakter"),
  tempatLahir: z.string().min(2, "Tempat lahir wajib diisi").default(""),
  tglLahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD"),
  jenisKelamin: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }).default("L"),
  alamat: z
    .string()
    .min(10, "Alamat domisili lengkap minimal 10 karakter"),
  provinsi: z.string().min(1, "Provinsi wajib dipilih").default(""),
  kabupatenKota: z.string().min(1, "Kabupaten/Kota wajib dipilih").default(""),
  kecamatan: z.string().min(1, "Kecamatan wajib dipilih").default(""),
  kelurahan: z.string().min(1, "Kelurahan wajib dipilih").default(""),
  noHp: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .max(15, "Nomor HP maksimal 15 digit")
    .regex(/^\+?[0-9]{10,15}$/, "Format nomor HP tidak valid"),
  noWa: z.string().optional(),
  email: z.string().email("Format alamat email tidak valid"),
});

export type Step1BiodataInput = z.infer<typeof step1BiodataSchema>;

export const step2PendidikanSchema = z.object({
  pendidikanTerakhir: z.string().min(1, "Pilih jenjang pendidikan terakhir"),
  namaInstansi: z
    .string()
    .min(3, "Nama instansi/sekolah/universitas minimal 3 karakter")
    .max(255, "Nama instansi maksimal 255 karakter"),
  jurusan: z
    .string()
    .min(2, "Jurusan/Program studi minimal 2 karakter")
    .max(255, "Jurusan maksimal 255 karakter"),
  pekerjaanSaatIni: z
    .string()
    .min(2, "Status pekerjaan saat ini minimal 2 karakter")
    .max(100, "Status pekerjaan maksimal 100 karakter"),
});

export type Step2PendidikanInput = z.infer<typeof step2PendidikanSchema>;

export const step3DokumenItemSchema = z.object({
  persyaratanId: z.string().min(1, "Persyaratan ID wajib diisi"),
  dokumenId: z.string().min(1, "Dokumen ID wajib diisi"),
  tipeDokumen: z.string().optional(),
  fileName: z.string().optional(),
  fileNameOriginal: z.string().optional(),
  fileUrl: z.string().optional(),
  catatanRevisi: z.string().optional(),
});

export const step3DokumenSchema = z.object({
  dokumenList: z
    .array(step3DokumenItemSchema)
    .min(1, "Minimal sertakan 1 dokumen persyaratan"),
});

export type Step3DokumenInput = z.infer<typeof step3DokumenSchema>;

export const step4PersetujuanSchema = z.object({
  pernyataanKeabsahan: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui pernyataan kebenaran data & dokumen",
  }),
  action: z.enum(["DRAFT", "SUBMIT"]).optional(),
});

export type Step4PersetujuanInput = z.infer<typeof step4PersetujuanSchema>;

export const verifikasiDecisionSchema = z.object({
  statusKeputusan: z.enum([
    "disetujui",
    "revisi",
    "ditolak",
    "DITERIMA",
    "PERLU_REVISI",
    "DITOLAK",
  ]),
  catatanVerifikator: z.string().min(5, "Catatan verifikator minimal 5 karakter"),
  dokumenChecklist: z
    .array(
      z.object({
        persyaratanId: z.string(),
        isSesuai: z.boolean(),
        catatanPerbaikan: z.string().optional(),
      })
    )
    .optional(),
});

export type VerifikasiDecisionInput = z.infer<typeof verifikasiDecisionSchema>;

export const wawancaraScoringSchema = z.object({
  skorKomunikasi: z.number().min(0).max(100),
  skorTeknis: z.number().min(0).max(100),
  skorKomitmen: z.number().min(0).max(100),
  nilaiAkhir: z.number().optional(),
  statusWawancara: z.enum(["Lulus", "Tidak Lulus", "LULUS", "TIDAK_LULUS"]),
  catatanEvaluasi: z.string().min(5, "Catatan evaluasi minimal 5 karakter"),
});

export type WawancaraScoringInput = z.infer<typeof wawancaraScoringSchema>;

