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
  async create(data: Omit<DokumenRecord, "id" | "isActive" | "createdAt" | "updatedAt">): Promise<DokumenRecord> {
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
  }

  async findUnique(id: string): Promise<DokumenRecord | null> {
    const doc = await prisma.dokumenPermohonan.findUnique({
      where: { id },
    });
    return (doc as any) || null;
  }

  async logAccess(
    dokumenId: string,
    userId: string,
    userRole: string,
    action: "VIEW" | "DOWNLOAD",
    ip: string,
    userAgent?: string | null
  ) {
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
  }
}

export const dokumenRepository = new DokumenRepository();
