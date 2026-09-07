import { z } from "zod";
import { TipeDokumen } from "../enums/index.js";

export const persyaratanSchema = z.object({
  id: z.string(),
  beasiswaId: z.string(),
  namaPersyaratan: z.string().min(2),
  tipeDokumen: z.enum([
    TipeDokumen.KTP,
    TipeDokumen.KK,
    TipeDokumen.IJAZAH,
    TipeDokumen.REKOMENDASI,
    TipeDokumen.LAINNYA,
  ]),
  isMandatory: z.boolean().default(true),
  maxFileSizeBytes: z.number().int().positive().default(5 * 1024 * 1024), // 5MB default
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Persyaratan = z.infer<typeof persyaratanSchema>;

export const beasiswaPelatihanSchema = z.object({
  id: z.string(),
  kodeBeasiswa: z.string().min(2),
  namaPelatihan: z.string().min(3),
  deskripsi: z.string().min(10),
  kuota: z.number().int().positive(),
  tglMulaiDaftar: z.string(),
  tglSelesaiDaftar: z.string(),
  isActive: z.boolean().default(true),
  persyaratan: z.array(persyaratanSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type BeasiswaPelatihan = z.infer<typeof beasiswaPelatihanSchema>;

export const createBeasiswaInputSchema = beasiswaPelatihanSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  persyaratan: true,
});

export type CreateBeasiswaInput = z.infer<typeof createBeasiswaInputSchema>;
