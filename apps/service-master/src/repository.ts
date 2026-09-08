import { prisma } from "./db.js";

export interface BeasiswaRecord {
  id: string;
  kodeBeasiswa: string;
  namaPelatihan: string;
  deskripsi: string;
  kuota: number;
  metode?: string;
  tglMulaiDaftar: Date;
  tglSelesaiDaftar: Date;
  isActive: boolean;
  persyaratan: PersyaratanRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PersyaratanRecord {
  id: string;
  beasiswaId: string;
  namaPersyaratan: string;
  tipeDokumen: string;
  isMandatory: boolean;
  maxFileSizeBytes: number;
}

class MasterRepository {
  async findAllActive(): Promise<BeasiswaRecord[]> {
    const list = await prisma.beasiswaPelatihan.findMany({
      where: { isActive: true },
      include: { persyaratan: true },
      orderBy: { createdAt: "desc" },
    });

    return list.map((b) => ({
      ...b,
      metode: "Daring (Online)",
      persyaratan: b.persyaratan.map((p) => ({
        ...p,
        maxFileSizeBytes: Number(p.maxFileSizeBytes),
      })),
    }));
  }

  async findById(id: string): Promise<BeasiswaRecord | null> {
    const b = await prisma.beasiswaPelatihan.findUnique({
      where: { id },
      include: { persyaratan: true },
    });

    if (!b) return null;

    return {
      ...b,
      metode: "Daring (Online)",
      persyaratan: b.persyaratan.map((p) => ({
        ...p,
        maxFileSizeBytes: Number(p.maxFileSizeBytes),
      })),
    };
  }

  async create(data: {
    kodeBeasiswa: string;
    namaPelatihan: string;
    deskripsi: string;
    kuota: number;
    tglMulaiDaftar: Date;
    tglSelesaiDaftar: Date;
    persyaratan?: Array<{
      namaPersyaratan: string;
      tipeDokumen: string;
      isMandatory?: boolean;
      maxFileSizeBytes?: number;
    }>;
  }): Promise<BeasiswaRecord> {
    const created = await prisma.beasiswaPelatihan.create({
      data: {
        kodeBeasiswa: data.kodeBeasiswa,
        namaPelatihan: data.namaPelatihan,
        deskripsi: data.deskripsi,
        kuota: data.kuota,
        tglMulaiDaftar: data.tglMulaiDaftar,
        tglSelesaiDaftar: data.tglSelesaiDaftar,
        persyaratan: {
          create: (data.persyaratan || []).map((p) => ({
            namaPersyaratan: p.namaPersyaratan,
            tipeDokumen: p.tipeDokumen,
            isMandatory: p.isMandatory ?? true,
            maxFileSizeBytes: BigInt(p.maxFileSizeBytes || 2097152),
          })),
        },
      },
      include: { persyaratan: true },
    });

    return {
      ...created,
      metode: "Daring (Online)",
      persyaratan: created.persyaratan.map((p) => ({
        ...p,
        maxFileSizeBytes: Number(p.maxFileSizeBytes),
      })),
    };
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await prisma.beasiswaPelatihan.findUnique({ where: { id } });
    if (!existing) return false;

    await prisma.beasiswaPelatihan.update({
      where: { id },
      data: { isActive: false },
    });

    return true;
  }

  // Persyaratan Management
  async findAllPersyaratan() {
    const list = await prisma.persyaratan.findMany({
      include: { beasiswa: true },
      orderBy: { createdAt: "desc" },
    });

    return list.map((p) => ({
      id: p.id,
      beasiswaId: p.beasiswaId,
      beasiswaNama: p.beasiswa.namaPelatihan,
      namaPersyaratan: p.namaPersyaratan,
      tipeDokumen: p.tipeDokumen,
      isMandatory: p.isMandatory,
      maxFileSizeBytes: Number(p.maxFileSizeBytes),
      maxSizeFormatted: `${(Number(p.maxFileSizeBytes) / (1024 * 1024)).toFixed(0)} MB`,
    }));
  }

  async createPersyaratan(data: {
    beasiswaId?: string;
    namaPersyaratan: string;
    tipeDokumen: string;
    isMandatory?: boolean;
    maxFileSizeBytes?: number;
  }) {
    // If no beasiswaId specified, attach to first active beasiswa or default
    let targetBeasiswaId = data.beasiswaId;
    if (!targetBeasiswaId) {
      const first = await prisma.beasiswaPelatihan.findFirst({ where: { isActive: true } });
      if (!first) throw new Error("Belum ada program beasiswa aktif untuk dikaitkan dengan persyaratan ini.");
      targetBeasiswaId = first.id;
    }

    const created = await prisma.persyaratan.create({
      data: {
        beasiswaId: targetBeasiswaId,
        namaPersyaratan: data.namaPersyaratan,
        tipeDokumen: data.tipeDokumen,
        isMandatory: data.isMandatory ?? true,
        maxFileSizeBytes: BigInt(data.maxFileSizeBytes || 2097152),
      },
      include: { beasiswa: true },
    });

    return {
      id: created.id,
      beasiswaId: created.beasiswaId,
      beasiswaNama: created.beasiswa.namaPelatihan,
      namaPersyaratan: created.namaPersyaratan,
      tipeDokumen: created.tipeDokumen,
      isMandatory: created.isMandatory,
      maxFileSizeBytes: Number(created.maxFileSizeBytes),
      maxSizeFormatted: `${(Number(created.maxFileSizeBytes) / (1024 * 1024)).toFixed(0)} MB`,
    };
  }

  async deletePersyaratan(id: string): Promise<boolean> {
    const existing = await prisma.persyaratan.findUnique({ where: { id } });
    if (!existing) return false;

    await prisma.persyaratan.delete({ where: { id } });
    return true;
  }
}

export const masterRepository = new MasterRepository();
