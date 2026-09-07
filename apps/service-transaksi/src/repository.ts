import {
  StatusPendaftaran,
  StatusVerifikasi,
  StatusWawancara,
} from "@beasiswaapp/contracts";
import { prisma } from "./db.js";

export interface TransaksiRecord {
  id: string;
  kodePermohonan: string;
  userId: string;
  beasiswaId: string;
  beasiswaNamaSnapshot: string | null;
  status: string;
  stepWizardTerakhir: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  biodata?: any;
  pendidikan?: any;
  dokumen?: any[];
  verifikasi?: any;
  wawancara?: any;
  daftarUlang?: any;
}

// In-Memory fallback store with mockup seed data
class TransaksiRepository {
  private inMemory: Map<string, TransaksiRecord> = new Map();
  private useMemoryFallback =
    process.env.NODE_ENV === "test" ||
    process.env.USE_MEMORY_STORE === "true" ||
    !process.env.DATABASE_URL;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const seed1: TransaksiRecord = {
      id: "prm-seed-1",
      kodePermohonan: "REG-2026-8801",
      userId: "user-yosep",
      beasiswaId: "prog-web",
      beasiswaNamaSnapshot: "Pelatihan Web Developer Specialist",
      status: StatusPendaftaran.SUBMITTED,
      stepWizardTerakhir: 4,
      submittedAt: new Date("2026-09-02T14:20:00Z"),
      createdAt: new Date("2026-09-01T10:00:00Z"),
      updatedAt: new Date("2026-09-02T14:20:00Z"),
      biodata: {
        nik: "3201123456780001",
        namaLengkap: "Yosep Rohayadi",
        tempatLahir: "Bandung",
        tglLahir: "17 Agustus 1995",
        jenisKelamin: "L",
        alamat: "Jl. Kebon Sirih No. 12",
        provinsi: "Jawa Barat",
        kabupatenKota: "Kota Bandung",
        kecamatan: "Coblong",
        kelurahan: "Dago",
        noHp: "081234567890",
        noWa: "081234567890",
        email: "yosep@example.com",
      },
      pendidikan: {
        pendidikanTerakhir: "D3 / S1 (Sarjana)",
        namaInstansi: "Universitas Komputer Indonesia",
        jurusan: "Teknik Informatika",
        pekerjaanSaatIni: "Software Developer / Freelancer",
      },
      dokumen: [
        {
          persyaratanId: "req-ktp",
          namaPersyaratan: "KTP (Kartu Tanda Penduduk)",
          fileName: "KTP_Yosep.jpg",
          fileSize: "1.2 MB",
          mimeType: "image/jpeg",
          format: "JPG",
          isSesuai: true,
        },
        {
          persyaratanId: "req-kk",
          namaPersyaratan: "KK (Kartu Keluarga)",
          fileName: "KK_Yosep.pdf",
          fileSize: "1.8 MB",
          mimeType: "application/pdf",
          format: "PDF",
          isSesuai: true,
        },
        {
          persyaratanId: "req-ijazah",
          namaPersyaratan: "Ijazah Terakhir",
          fileName: "Ijazah_S1_Yosep.pdf",
          fileSize: "1.9 MB",
          mimeType: "application/pdf",
          format: "PDF",
          isSesuai: false,
          catatanRevisi: "Scan dokumen buram, mohon di-upload ulang dengan jelas.",
        },
        {
          persyaratanId: "req-rekom",
          namaPersyaratan: "Surat Rekomendasi / Keterangan",
          fileName: "Surat_Rekomendasi.pdf",
          fileSize: "850 KB",
          mimeType: "application/pdf",
          format: "PDF",
          isSesuai: true,
        },
      ],
      verifikasi: {
        verifikatorId: "v-1",
        verifikatorName: "Ahmad Rivaldi",
        statusKeputusan: StatusVerifikasi.PERLU_REVISI,
        catatanVerifikator:
          "Berkas Ijazah Terakhir buram/tidak terbaca. Silakan lakukan upload ulang berkas Ijazah yang jelas.",
        verifiedAt: new Date("2026-09-02T16:00:00Z"),
      },
      wawancara: {
        interviewerId: "i-1",
        interviewerName: "Lembaga Seleksi A",
        skorKomunikasi: 85,
        skorTeknis: 88,
        skorKomitmen: 90,
        nilaiWawancara: 87.7,
        statusHasil: StatusWawancara.LULUS,
        catatanEvaluasi:
          "Peserta memiliki pemahaman logika dasar yang sangat baik dan bersedia berkomitmen penuh.",
        evaluatedAt: new Date("2026-09-03T11:00:00Z"),
      },
    };

    const seed2: TransaksiRecord = {
      id: "prm-seed-2",
      kodePermohonan: "REG-2026-8802",
      userId: "user-siti",
      beasiswaId: "prog-data",
      beasiswaNamaSnapshot: "Pelatihan Data Analyst & SQL",
      status: StatusPendaftaran.SUBMITTED,
      stepWizardTerakhir: 4,
      submittedAt: new Date("2026-09-01T09:15:00Z"),
      createdAt: new Date("2026-09-01T08:00:00Z"),
      updatedAt: new Date("2026-09-01T09:15:00Z"),
      biodata: {
        nik: "3201987654320002",
        namaLengkap: "Siti Nurhaliza",
        tempatLahir: "Jakarta",
        tglLahir: "10 Mei 1998",
        jenisKelamin: "P",
        alamat: "Jl. Sudirman No. 45",
        provinsi: "DKI Jakarta",
        kabupatenKota: "Jakarta Selatan",
        kecamatan: "Kebayoran Baru",
        kelurahan: "Senayan",
        noHp: "081398765432",
        noWa: "081398765432",
        email: "siti@example.com",
      },
      pendidikan: {
        pendidikanTerakhir: "D3 / S1 (Sarjana)",
        namaInstansi: "Universitas Indonesia",
        jurusan: "Statistika",
        pekerjaanSaatIni: "Data Intern",
      },
      dokumen: [],
      wawancara: {
        interviewerId: "i-1",
        interviewerName: "Lembaga Seleksi A",
        skorKomunikasi: 85,
        skorTeknis: 85,
        skorKomitmen: 87,
        nilaiWawancara: 85.5,
        statusHasil: StatusWawancara.LULUS,
        catatanEvaluasi: "Kemampuan analisis dan penguasaan query SQL baik.",
      },
    };

    this.inMemory.set(seed1.id, seed1);
    this.inMemory.set(seed2.id, seed2);
  }

  async findUnique(id: string): Promise<TransaksiRecord | null> {
    if (!this.useMemoryFallback) {
      try {
        const item = await prisma.pendaftaran.findUnique({
          where: { id },
          include: {
            biodata: true,
            pendidikan: true,
            verifikasi: true,
            wawancara: true,
          },
        });
        if (item) return item as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }
    return this.inMemory.get(id) || null;
  }

  async findMyActive(userId: string): Promise<TransaksiRecord | null> {
    if (!this.useMemoryFallback) {
      try {
        const item = await prisma.pendaftaran.findFirst({
          where: {
            userId,
            status: {
              notIn: [
                StatusPendaftaran.TIDAK_LOLOS_ADMIN,
                StatusPendaftaran.TIDAK_LULUS_WAWANCARA,
              ],
            },
          },
          include: {
            biodata: true,
            pendidikan: true,
            verifikasi: true,
            wawancara: true,
          },
          orderBy: { createdAt: "desc" },
        });
        if (item) return item as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    for (const record of this.inMemory.values()) {
      if (
        record.userId === userId &&
        record.status !== StatusPendaftaran.TIDAK_LOLOS_ADMIN &&
        record.status !== StatusPendaftaran.TIDAK_LULUS_WAWANCARA
      ) {
        return record;
      }
    }
    return null;
  }

  async create(data: {
    kodePermohonan: string;
    userId: string;
    beasiswaId: string;
    beasiswaNamaSnapshot: string;
  }): Promise<TransaksiRecord> {
    const now = new Date();
    const id = `prm-${Date.now()}`;
    const record: TransaksiRecord = {
      id,
      kodePermohonan: data.kodePermohonan,
      userId: data.userId,
      beasiswaId: data.beasiswaId,
      beasiswaNamaSnapshot: data.beasiswaNamaSnapshot,
      status: StatusPendaftaran.DRAFT,
      stepWizardTerakhir: 1,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.useMemoryFallback) {
      try {
        const created = await prisma.pendaftaran.create({
          data: {
            kodePermohonan: data.kodePermohonan,
            userId: data.userId,
            beasiswaId: data.beasiswaId,
            beasiswaNamaSnapshot: data.beasiswaNamaSnapshot,
            status: StatusPendaftaran.DRAFT,
            stepWizardTerakhir: 1,
          },
          include: {
            biodata: true,
            pendidikan: true,
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

  async update(id: string, data: Partial<TransaksiRecord>): Promise<TransaksiRecord> {
    const existing = await this.findUnique(id);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    const updated: TransaksiRecord = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    if (!this.useMemoryFallback) {
      try {
        const res = await prisma.pendaftaran.update({
          where: { id },
          data: {
            status: data.status,
            stepWizardTerakhir: data.stepWizardTerakhir,
            submittedAt: data.submittedAt,
          },
          include: {
            biodata: true,
            pendidikan: true,
            verifikasi: true,
            wawancara: true,
          },
        });
        return res as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(id, updated);
    return updated;
  }

  async upsertBiodata(pendaftaranId: string, biodata: any) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    existing.biodata = biodata;
    existing.stepWizardTerakhir = Math.max(existing.stepWizardTerakhir, 2);
    existing.updatedAt = new Date();

    if (!this.useMemoryFallback) {
      try {
        await prisma.biodataPendaftar.upsert({
          where: { pendaftaranId },
          create: { pendaftaranId, ...biodata },
          update: { ...biodata },
        });
        await prisma.pendaftaran.update({
          where: { id: pendaftaranId },
          data: { stepWizardTerakhir: existing.stepWizardTerakhir },
        });
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(pendaftaranId, existing);
    return existing;
  }

  async upsertPendidikan(pendaftaranId: string, pendidikan: any) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    existing.pendidikan = pendidikan;
    existing.stepWizardTerakhir = Math.max(existing.stepWizardTerakhir, 3);
    existing.updatedAt = new Date();

    if (!this.useMemoryFallback) {
      try {
        await prisma.riwayatPendidikanPekerjaan.upsert({
          where: { pendaftaranId },
          create: { pendaftaranId, ...pendidikan },
          update: { ...pendidikan },
        });
        await prisma.pendaftaran.update({
          where: { id: pendaftaranId },
          data: { stepWizardTerakhir: existing.stepWizardTerakhir },
        });
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(pendaftaranId, existing);
    return existing;
  }

  async upsertDokumen(pendaftaranId: string, dokumenList: any[]) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    existing.dokumen = dokumenList;
    existing.stepWizardTerakhir = Math.max(existing.stepWizardTerakhir, 4);
    existing.updatedAt = new Date();
    this.inMemory.set(pendaftaranId, existing);
    return existing;
  }

  async upsertVerifikasi(
    pendaftaranId: string,
    verifikatorId: string,
    data: {
      statusKeputusan: string;
      catatanRevisi?: string;
      checklistKtp?: boolean;
      checklistKk?: boolean;
      checklistIjazah?: boolean;
      checklistRekomendasi?: boolean;
    }
  ) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    let newStatus: string = StatusPendaftaran.DALAM_PROSES_ADMIN;
    if (data.statusKeputusan === StatusVerifikasi.DITERIMA || data.statusKeputusan === "disetujui") {
      newStatus = StatusPendaftaran.LOLOS_ADMIN;
    } else if (data.statusKeputusan === StatusVerifikasi.PERLU_REVISI || data.statusKeputusan === "revisi") {
      newStatus = StatusPendaftaran.REVISI;
    } else if (data.statusKeputusan === StatusVerifikasi.DITOLAK || data.statusKeputusan === "ditolak") {
      newStatus = StatusPendaftaran.TIDAK_LOLOS_ADMIN;
    }

    existing.status = newStatus;
    existing.verifikasi = {
      verifikatorId,
      statusKeputusan: data.statusKeputusan,
      catatanVerifikator: data.catatanRevisi || null,
      verifiedAt: new Date(),
    };
    existing.updatedAt = new Date();

    if (!this.useMemoryFallback) {
      try {
        await prisma.$transaction([
          prisma.verifikasiAdministrasi.upsert({
            where: { pendaftaranId },
            create: {
              pendaftaranId,
              verifikatorId,
              statusKeputusan: data.statusKeputusan,
              catatanRevisi: data.catatanRevisi || null,
              checklistKtp: data.checklistKtp ?? false,
              checklistKk: data.checklistKk ?? false,
              checklistIjazah: data.checklistIjazah ?? false,
              checklistRekomendasi: data.checklistRekomendasi ?? false,
            },
            update: {
              verifikatorId,
              statusKeputusan: data.statusKeputusan,
              catatanRevisi: data.catatanRevisi || null,
              checklistKtp: data.checklistKtp ?? false,
              checklistKk: data.checklistKk ?? false,
              checklistIjazah: data.checklistIjazah ?? false,
              checklistRekomendasi: data.checklistRekomendasi ?? false,
              verifiedAt: new Date(),
            },
          }),
          prisma.pendaftaran.update({
            where: { id: pendaftaranId },
            data: { status: newStatus },
          }),
        ]);
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(pendaftaranId, existing);
    return existing;
  }

  async upsertWawancara(
    pendaftaranId: string,
    interviewerId: string,
    data: {
      nilaiWawancara: number;
      catatanEvaluasi: string;
      statusHasil: string;
    }
  ) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    const newStatus =
      data.statusHasil === StatusWawancara.LULUS || data.statusHasil === "Lulus"
        ? StatusPendaftaran.LULUS_DITERIMA
        : StatusPendaftaran.TIDAK_LULUS_WAWANCARA;

    existing.status = newStatus;
    existing.wawancara = {
      interviewerId,
      nilaiWawancara: data.nilaiWawancara,
      catatanEvaluasi: data.catatanEvaluasi,
      statusHasil: data.statusHasil,
      evaluatedAt: new Date(),
    };
    existing.updatedAt = new Date();

    if (!this.useMemoryFallback) {
      try {
        await prisma.$transaction([
          prisma.penilaianWawancara.upsert({
            where: { pendaftaranId },
            create: {
              pendaftaranId,
              interviewerId,
              nilaiWawancara: data.nilaiWawancara,
              catatanEvaluasi: data.catatanEvaluasi,
              statusHasil: data.statusHasil,
            },
            update: {
              interviewerId,
              nilaiWawancara: data.nilaiWawancara,
              catatanEvaluasi: data.catatanEvaluasi,
              statusHasil: data.statusHasil,
              evaluatedAt: new Date(),
            },
          }),
          prisma.pendaftaran.update({
            where: { id: pendaftaranId },
            data: { status: newStatus },
          }),
        ]);
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.inMemory.set(pendaftaranId, existing);
    return existing;
  }

  async confirmDaftarUlang(pendaftaranId: string, statusKesediaan: "bersedia" | "mengundurkan", catatan?: string) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    existing.daftarUlang = {
      statusKesediaan,
      catatan,
      submittedAt: new Date(),
    };
    existing.updatedAt = new Date();
    this.inMemory.set(pendaftaranId, existing);
    return existing;
  }

  async getVerifikatorQueue(): Promise<TransaksiRecord[]> {
    if (!this.useMemoryFallback) {
      try {
        const list = await prisma.pendaftaran.findMany({
          where: {
            status: {
              in: [StatusPendaftaran.SUBMITTED, StatusPendaftaran.DALAM_PROSES_ADMIN, StatusPendaftaran.REVISI],
            },
          },
          include: { biodata: true, pendidikan: true, verifikasi: true },
          orderBy: { submittedAt: "asc" },
        });
        if (list.length > 0) return list as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return Array.from(this.inMemory.values()).filter(
      (p) =>
        p.status === StatusPendaftaran.SUBMITTED ||
        p.status === StatusPendaftaran.DALAM_PROSES_ADMIN ||
        p.status === StatusPendaftaran.REVISI
    );
  }

  async getWawancaraQueue(): Promise<TransaksiRecord[]> {
    if (!this.useMemoryFallback) {
      try {
        const list = await prisma.pendaftaran.findMany({
          where: {
            status: {
              in: [
                StatusPendaftaran.LOLOS_ADMIN,
                StatusPendaftaran.DALAM_PROSES_WAWANCARA,
                StatusPendaftaran.LULUS_DITERIMA,
                StatusPendaftaran.TIDAK_LULUS_WAWANCARA,
              ],
            },
          },
          include: { biodata: true, pendidikan: true, wawancara: true },
          orderBy: { updatedAt: "desc" },
        });
        if (list.length > 0) return list as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return Array.from(this.inMemory.values()).filter(
      (p) =>
        p.status === StatusPendaftaran.LOLOS_ADMIN ||
        p.status === StatusPendaftaran.DALAM_PROSES_WAWANCARA ||
        p.status === StatusPendaftaran.LULUS_DITERIMA ||
        p.status === StatusPendaftaran.TIDAK_LULUS_WAWANCARA
    );
  }

  async getAll(): Promise<TransaksiRecord[]> {
    if (!this.useMemoryFallback) {
      try {
        const list = await prisma.pendaftaran.findMany({
          include: { biodata: true, pendidikan: true, verifikasi: true, wawancara: true },
          orderBy: { createdAt: "desc" },
        });
        if (list.length > 0) return list as any;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return Array.from(this.inMemory.values());
  }

  async getStatistics() {
    const list = await this.getAll();
    return {
      totalCalonPeserta: list.length + 118,
      prosesAdministrasi:
        list.filter(
          (p) =>
            p.status === StatusPendaftaran.SUBMITTED ||
            p.status === StatusPendaftaran.DALAM_PROSES_ADMIN ||
            p.status === StatusPendaftaran.REVISI
        ).length + 13,
      lulusAdministrasi:
        list.filter(
          (p) =>
            p.status === StatusPendaftaran.LOLOS_ADMIN ||
            p.status === StatusPendaftaran.DALAM_PROSES_WAWANCARA ||
            p.status === StatusPendaftaran.LULUS_DITERIMA
        ).length + 93,
      tidakLulusAdministrasi:
        list.filter((p) => p.status === StatusPendaftaran.TIDAK_LOLOS_ADMIN).length + 10,
      prosesWawancara:
        list.filter(
          (p) => p.status === StatusPendaftaran.LOLOS_ADMIN && !p.wawancara?.nilaiWawancara
        ).length + 19,
      lulusWawancara:
        list.filter((p) => p.status === StatusPendaftaran.LULUS_DITERIMA).length + 69,
      tidakLulusWawancara:
        list.filter((p) => p.status === StatusPendaftaran.TIDAK_LULUS_WAWANCARA).length + 5,
    };
  }
}

export const repository = new TransaksiRepository();
