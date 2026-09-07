import crypto from "node:crypto";
import { prisma } from "./db.js";

export interface DokumenRecord {
  id: string;
  pendaftaranId: string;
  kodePermohonan: string;
  persyaratanId: string;
  userId: string;
  fileNameOriginal: string;
  fileNameUuid: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: bigint;
  magicBytesHex: string;
  magicBytesVerified: boolean;
  sha256Hash: string;
  clamavScanStatus: string;
  clamavSignature: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class DokumenRepository {
  private inMemory: Map<string, DokumenRecord> = new Map();
  private useMemoryFallback =
    process.env.NODE_ENV === "test" ||
    process.env.USE_MEMORY_STORE === "true" ||
    !process.env.DATABASE_URL;

  async create(data: Omit<DokumenRecord, "id" | "isActive" | "createdAt" | "updatedAt">): Promise<DokumenRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const record: DokumenRecord = {
      id,
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.useMemoryFallback) {
      try {
        const created = await prisma.dokumenPermohonan.create({
          data: {
            pendaftaranId: data.pendaftaranId,
            kodePermohonan: data.kodePermohonan,
            persyaratanId: data.persyaratanId,
            userId: data.userId,
            fileNameOriginal: data.fileNameOriginal,
            fileNameUuid: data.fileNameUuid,
            filePath: data.filePath,
            mimeType: data.mimeType,
            fileSizeBytes: data.fileSizeBytes,
            magicBytesHex: data.magicBytesHex,
            magicBytesVerified: data.magicBytesVerified,
            sha256Hash: data.sha256Hash,
            clamavScanStatus: data.clamavScanStatus,
            clamavSignature: data.clamavSignature,
          },
        });
        return created as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(id, record);
    return record;
  }

  async findUnique(id: string): Promise<DokumenRecord | null> {
    if (!this.useMemoryFallback) {
      try {
        const doc = await prisma.dokumenPermohonan.findUnique({
          where: { id },
        });
        if (doc) return doc as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return this.inMemory.get(id) || null;
  }

  async logAccess(dokumenId: string, userId: string, userRole: string, action: "VIEW" | "DOWNLOAD", ip: string, userAgent?: string | null) {
    if (!this.useMemoryFallback) {
      try {
        await prisma.dokumenAccessLog.create({
          data: {
            dokumenId,
            userId: userId || "anonymous",
            userRole,
            action,
            ipAddress: ip,
            userAgent: userAgent || null,
          },
        });
      } catch {
        this.useMemoryFallback = true;
      }
    }
  }
}

export const dokumenRepository = new DokumenRepository();
