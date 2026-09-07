import { z } from "zod";
import { ScanStatus } from "../enums/index.js";

export const dokumenMetadataSchema = z.object({
  id: z.string().uuid(),
  pendaftaranId: z.string(),
  kodePermohonan: z.string(),
  persyaratanId: z.string(),
  userId: z.string(),
  fileNameOriginal: z.string(),
  fileNameUuid: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().nonnegative(),
  magicBytesHex: z.string(),
  magicBytesVerified: z.boolean(),
  sha256Hash: z.string(),
  clamavScanStatus: z.enum([
    ScanStatus.CLEAN,
    ScanStatus.INFECTED,
    ScanStatus.SCAN_FAILED,
    ScanStatus.SKIPPED_MOCK,
  ]),
  clamavSignature: z.string().optional().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DokumenMetadata = z.infer<typeof dokumenMetadataSchema>;

export const uploadDokumenResponseSchema = z.object({
  success: z.boolean(),
  dokumen: dokumenMetadataSchema,
  message: z.string(),
});

export type UploadDokumenResponse = z.infer<typeof uploadDokumenResponseSchema>;
