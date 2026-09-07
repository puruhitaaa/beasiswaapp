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
  private inMemory: Map<string, BeasiswaRecord> = new Map();
  private useMemoryFallback =
    process.env.NODE_ENV === "test" ||
    process.env.USE_MEMORY_STORE === "true" ||
    !process.env.DATABASE_URL;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const p1: BeasiswaRecord = {
      id: "prog-web",
      kodeBeasiswa: "PRG-WEB-001",
      namaPelatihan: "Pelatihan Web Developer Specialist",
      deskripsi: "Program pelatihan intensif full-stack web development dari frontend hingga deployment server.",
      kuota: 100,
      metode: "Daring (Online)",
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      persyaratan: [
        {
          id: "req-ktp",
          beasiswaId: "prog-web",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          tipeDokumen: "JPG, PNG, PDF",
          isMandatory: true,
          maxFileSizeBytes: 2097152,
        },
        {
          id: "req-kk",
          beasiswaId: "prog-web",
          namaPersyaratan: "KK (Kartu Keluarga)",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: 2097152,
        },
        {
          id: "req-ijazah",
          beasiswaId: "prog-web",
          namaPersyaratan: "Ijazah Terakhir",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: 2097152,
        },
        {
          id: "req-rekom",
          beasiswaId: "prog-web",
          namaPersyaratan: "Surat Rekomendasi / Keterangan",
          tipeDokumen: "PDF",
          isMandatory: true,
          maxFileSizeBytes: 2097152,
        },
      ],
    };

    const p2: BeasiswaRecord = {
      id: "prog-data",
      kodeBeasiswa: "PRG-DATA-002",
      namaPelatihan: "Pelatihan Data Analyst & SQL",
      deskripsi: "Kuasai analisis data komprehensif, relational database SQL, data visualization, dan reporting.",
      kuota: 80,
      metode: "Daring (Online)",
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      persyaratan: [
        {
          id: "req-ktp",
          beasiswaId: "prog-data",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          tipeDokumen: "JPG, PNG, PDF",
          isMandatory: true,
          maxFileSizeBytes: 2097152,
        },
      ],
    };

    const p3: BeasiswaRecord = {
      id: "prog-uiux",
      kodeBeasiswa: "PRG-UIUX-003",
      namaPelatihan: "UI/UX Design & Prototyping",
      deskripsi: "Pelajari user research, user journey mapping, wireframing, interactive prototyping, dan usability testing.",
      kuota: 60,
      metode: "Hybrid",
      tglMulaiDaftar: new Date("2026-01-01"),
      tglSelesaiDaftar: new Date("2026-12-31"),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      persyaratan: [],
    };

    this.inMemory.set(p1.id, p1);
    this.inMemory.set(p2.id, p2);
    this.inMemory.set(p3.id, p3);
  }

  async findAllActive(): Promise<BeasiswaRecord[]> {
    if (!this.useMemoryFallback) {
      try {
        const list = await prisma.beasiswaPelatihan.findMany({
          where: { isActive: true },
          include: { persyaratan: true },
          orderBy: { createdAt: "desc" },
        });
        if (list.length > 0) {
          return list.map((b: any) => ({
            ...b,
            persyaratan: b.persyaratan.map((p: any) => ({
              ...p,
              maxFileSizeBytes: Number(p.maxFileSizeBytes),
            })),
          }));
        }
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return Array.from(this.inMemory.values()).filter((b) => b.isActive);
  }

  async findById(id: string): Promise<BeasiswaRecord | null> {
    if (!this.useMemoryFallback) {
      try {
        const item = await prisma.beasiswaPelatihan.findUnique({
          where: { id },
          include: { persyaratan: true },
        });
        if (item) {
          return {
            ...item,
            persyaratan: item.persyaratan.map((p: any) => ({
              ...p,
              maxFileSizeBytes: Number(p.maxFileSizeBytes),
            })),
          } as any;
        }
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return this.inMemory.get(id) || null;
  }

  async create(data: {
    kodeBeasiswa: string;
    namaPelatihan: string;
    deskripsi: string;
    kuota: number;
    tglMulaiDaftar: Date;
    tglSelesaiDaftar: Date;
    persyaratan?: any[];
  }): Promise<BeasiswaRecord> {
    const id = `prog-${Date.now()}`;
    const now = new Date();
    const pers: PersyaratanRecord[] = (data.persyaratan || []).map((p, idx) => ({
      id: `req-${Date.now()}-${idx}`,
      beasiswaId: id,
      namaPersyaratan: p.namaPersyaratan,
      tipeDokumen: p.tipeDokumen || "PDF",
      isMandatory: p.isMandatory ?? true,
      maxFileSizeBytes: Number(p.maxFileSizeBytes || 2097152),
    }));

    const record: BeasiswaRecord = {
      id,
      kodeBeasiswa: data.kodeBeasiswa,
      namaPelatihan: data.namaPelatihan,
      deskripsi: data.deskripsi,
      kuota: data.kuota,
      tglMulaiDaftar: data.tglMulaiDaftar,
      tglSelesaiDaftar: data.tglSelesaiDaftar,
      isActive: true,
      persyaratan: pers,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.useMemoryFallback) {
      try {
        const created = await prisma.beasiswaPelatihan.create({
          data: {
            kodeBeasiswa: data.kodeBeasiswa,
            namaPelatihan: data.namaPelatihan,
            deskripsi: data.deskripsi,
            kuota: data.kuota,
            tglMulaiDaftar: data.tglMulaiDaftar,
            tglSelesaiDaftar: data.tglSelesaiDaftar,
            persyaratan: {
              create: (data.persyaratan || []).map((p: any) => ({
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
          persyaratan: created.persyaratan.map((p: any) => ({
            ...p,
            maxFileSizeBytes: Number(p.maxFileSizeBytes),
          })),
        } as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(id, record);
    return record;
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    existing.isActive = false;
    existing.updatedAt = new Date();

    if (!this.useMemoryFallback) {
      try {
        await prisma.beasiswaPelatihan.update({
          where: { id },
          data: { isActive: false },
        });
        return true;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(id, existing);
    return true;
  }
}

export const masterRepository = new MasterRepository();
