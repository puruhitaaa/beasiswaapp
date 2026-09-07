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
  tglLahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD"),
  alamat: z
    .string()
    .min(10, "Alamat domisili lengkap minimal 10 karakter"),
  noHp: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .max(15, "Nomor HP maksimal 15 digit")
    .regex(/^\+?[0-9]{10,15}$/, "Format nomor HP tidak valid"),
  noWa: z
    .string()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15, "Nomor WhatsApp maksimal 15 digit")
    .regex(/^\+?[0-9]{10,15}$/, "Format nomor WhatsApp tidak valid"),
  email: z.string().email("Format alamat email tidak valid"),
});

export type Step1BiodataInput = z.infer<typeof step1BiodataSchema>;

export const step2PendidikanSchema = z.object({
  pendidikanTerakhir: z.enum(
    ["SMA/SMK", "D1", "D2", "D3", "D4/S1", "S2", "S3"],
    { message: "Pilih jenjang pendidikan terakhir yang valid" }
  ),
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
  dokumenId: z.string().uuid("Dokumen ID harus berformat UUID yang valid"),
  tipeDokumen: z.string().min(1, "Tipe dokumen wajib diisi"),
  fileName: z.string().min(1, "Nama file wajib diisi"),
});

export const step3DokumenSchema = z.object({
  dokumenList: z
    .array(step3DokumenItemSchema)
    .min(1, "Minimal sertakan 1 dokumen persyaratan"),
});

export type Step3DokumenInput = z.infer<typeof step3DokumenSchema>;

export const step4PersetujuanSchema = z.object({
  pernyataanKebenaran: z.literal(true, {
    message: "Anda wajib menyetujui pernyataan kebenaran data & fakta",
  }),
  action: z.enum(["DRAFT", "SUBMIT"], {
    message: "Aksi harus berupa DRAFT atau SUBMIT",
  }),
});

export type Step4PersetujuanInput = z.infer<typeof step4PersetujuanSchema>;
