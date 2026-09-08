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

class TransaksiRepository {
  async findUnique(id: string): Promise<TransaksiRecord | null> {
    const item = await prisma.pendaftaran.findUnique({
      where: { id },
      include: {
        biodata: true,
        pendidikan: true,
        dokumen: true,
        verifikasi: true,
        wawancara: true,
      },
    });
    return (item as any) || null;
  }

  async findMyActive(userId: string): Promise<TransaksiRecord | null> {
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
        dokumen: true,
        verifikasi: true,
        wawancara: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return (item as any) || null;
  }

  async create(data: {
    kodePermohonan: string;
    userId: string;
    beasiswaId: string;
    beasiswaNamaSnapshot: string;
  }): Promise<TransaksiRecord> {
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
        dokumen: true,
      },
    });
    return created as any;
  }

  async update(id: string, data: Partial<TransaksiRecord>): Promise<TransaksiRecord> {
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
        dokumen: true,
        verifikasi: true,
        wawancara: true,
      },
    });
    return res as any;
  }

  async upsertBiodata(pendaftaranId: string, biodata: any) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    const nextStep = Math.max(existing.stepWizardTerakhir, 2);

    await prisma.$transaction([
      prisma.biodataPendaftar.upsert({
        where: { pendaftaranId },
        create: {
          pendaftaranId,
          nik: biodata.nik,
          namaLengkap: biodata.namaLengkap,
          tempatLahir: biodata.tempatLahir || null,
          tglLahir: biodata.tglLahir,
          jenisKelamin: biodata.jenisKelamin || null,
          alamat: biodata.alamat,
          provinsi: biodata.provinsi || null,
          kabupatenKota: biodata.kabupatenKota || null,
          kecamatan: biodata.kecamatan || null,
          kelurahan: biodata.kelurahan || null,
          noHp: biodata.noHp,
          noWa: biodata.noWa || biodata.noHp,
          email: biodata.email,
        },
        update: {
          nik: biodata.nik,
          namaLengkap: biodata.namaLengkap,
          tempatLahir: biodata.tempatLahir || null,
          tglLahir: biodata.tglLahir,
          jenisKelamin: biodata.jenisKelamin || null,
          alamat: biodata.alamat,
          provinsi: biodata.provinsi || null,
          kabupatenKota: biodata.kabupatenKota || null,
          kecamatan: biodata.kecamatan || null,
          kelurahan: biodata.kelurahan || null,
          noHp: biodata.noHp,
          noWa: biodata.noWa || biodata.noHp,
          email: biodata.email,
        },
      }),
      prisma.pendaftaran.update({
        where: { id: pendaftaranId },
        data: { stepWizardTerakhir: nextStep },
      }),
    ]);

    return this.findUnique(pendaftaranId);
  }

  async upsertPendidikan(pendaftaranId: string, pendidikan: any) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    const nextStep = Math.max(existing.stepWizardTerakhir, 3);

    await prisma.$transaction([
      prisma.riwayatPendidikanPekerjaan.upsert({
        where: { pendaftaranId },
        create: {
          pendaftaranId,
          pendidikanTerakhir: pendidikan.pendidikanTerakhir,
          namaInstansi: pendidikan.namaInstansi,
          jurusan: pendidikan.jurusan,
          pekerjaanSaatIni: pendidikan.pekerjaanSaatIni,
        },
        update: {
          pendidikanTerakhir: pendidikan.pendidikanTerakhir,
          namaInstansi: pendidikan.namaInstansi,
          jurusan: pendidikan.jurusan,
          pekerjaanSaatIni: pendidikan.pekerjaanSaatIni,
        },
      }),
      prisma.pendaftaran.update({
        where: { id: pendaftaranId },
        data: { stepWizardTerakhir: nextStep },
      }),
    ]);

    return this.findUnique(pendaftaranId);
  }

  async upsertDokumen(pendaftaranId: string, dokumenList: any[]) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    const nextStep = Math.max(existing.stepWizardTerakhir, 4);

    if (Array.isArray(dokumenList) && dokumenList.length > 0) {
      await prisma.$transaction([
        ...dokumenList.map((doc: any) =>
          prisma.dokumenPendaftaran.upsert({
            where: {
              pendaftaranId_persyaratanId: {
                pendaftaranId,
                persyaratanId: doc.persyaratanId,
              },
            },
            create: {
              pendaftaranId,
              persyaratanId: doc.persyaratanId,
              namaPersyaratan: doc.namaPersyaratan || null,
              dokumenId: doc.dokumenId || doc.id || null,
              fileName: doc.fileName || "",
              fileSize: doc.fileSize || null,
              mimeType: doc.mimeType || null,
              format: doc.format || null,
              fileUrl: doc.fileUrl || (doc.dokumenId || doc.id ? `/api/dokumen/${doc.dokumenId || doc.id}/view` : null),
              isSesuai: doc.isSesuai !== undefined ? doc.isSesuai : true,
              isRejected: doc.isRejected !== undefined ? doc.isRejected : false,
              catatanRevisi: doc.catatanRevisi || null,
            },
            update: {
              namaPersyaratan: doc.namaPersyaratan || undefined,
              dokumenId: doc.dokumenId || doc.id || undefined,
              fileName: doc.fileName !== undefined ? doc.fileName : undefined,
              fileSize: doc.fileSize || undefined,
              mimeType: doc.mimeType || undefined,
              format: doc.format || undefined,
              fileUrl: doc.fileUrl || (doc.dokumenId || doc.id ? `/api/dokumen/${doc.dokumenId || doc.id}/view` : undefined),
              isSesuai: doc.isSesuai !== undefined ? doc.isSesuai : undefined,
              isRejected: doc.isRejected !== undefined ? doc.isRejected : undefined,
              catatanRevisi: doc.catatanRevisi !== undefined ? doc.catatanRevisi : undefined,
            },
          })
        ),
        prisma.pendaftaran.update({
          where: { id: pendaftaranId },
          data: { stepWizardTerakhir: nextStep },
        }),
      ]);
    } else {
      await prisma.pendaftaran.update({
        where: { id: pendaftaranId },
        data: { stepWizardTerakhir: nextStep },
      });
    }

    return this.findUnique(pendaftaranId);
  }

  async submitApplication(id: string) {
    const existing = await this.findUnique(id);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    return prisma.pendaftaran.update({
      where: { id },
      data: {
        status: StatusPendaftaran.SUBMITTED,
        submittedAt: new Date(),
        stepWizardTerakhir: 4,
      },
      include: {
        biodata: true,
        pendidikan: true,
        dokumen: true,
        verifikasi: true,
        wawancara: true,
      },
    });
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
      checklistDokumen?: Record<string, { isSesuai?: boolean; catatanPerbaikan?: string }>;
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

    const docCheckMap: Record<string, { isSesuai?: boolean; catatan?: string }> = {
      "req-ktp": { isSesuai: data.checklistKtp, catatan: data.checklistDokumen?.["req-ktp"]?.catatanPerbaikan },
      "req-kk": { isSesuai: data.checklistKk, catatan: data.checklistDokumen?.["req-kk"]?.catatanPerbaikan },
      "req-ijazah": { isSesuai: data.checklistIjazah, catatan: data.checklistDokumen?.["req-ijazah"]?.catatanPerbaikan },
      "req-rekom": { isSesuai: data.checklistRekomendasi, catatan: data.checklistDokumen?.["req-rekom"]?.catatanPerbaikan },
    };

    for (const [persyaratanId, check] of Object.entries(docCheckMap)) {
      if (check.isSesuai !== undefined) {
        await prisma.dokumenPendaftaran.updateMany({
          where: { pendaftaranId, persyaratanId },
          data: {
            isSesuai: check.isSesuai,
            isRejected: !check.isSesuai,
            catatanRevisi: !check.isSesuai ? (check.catatan || data.catatanRevisi || "Perlu revisi dokumen") : null,
          },
        });
      }
    }

    return this.findUnique(pendaftaranId);
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

    return this.findUnique(pendaftaranId);
  }

  async confirmDaftarUlang(
    pendaftaranId: string,
    statusKesediaan: "bersedia" | "mengundurkan",
    _catatan?: string
  ) {
    const existing = await this.findUnique(pendaftaranId);
    if (!existing) throw new Error("Permohonan tidak ditemukan.");

    const newStatus =
      statusKesediaan === "bersedia"
        ? StatusPendaftaran.LULUS_DITERIMA
        : "MENGUNDURKAN_DIRI";

    await prisma.pendaftaran.update({
      where: { id: pendaftaranId },
      data: { status: newStatus },
    });

    const res = await this.findUnique(pendaftaranId);
    if (res) {
      res.daftarUlang = {
        statusKesediaan,
        catatan: _catatan,
      };
    }
    return res;
  }

  async getVerifikatorQueue(): Promise<TransaksiRecord[]> {
    const list = await prisma.pendaftaran.findMany({
      where: {
        status: {
          in: [
            StatusPendaftaran.SUBMITTED,
            StatusPendaftaran.DALAM_PROSES_ADMIN,
            StatusPendaftaran.REVISI,
          ],
        },
      },
      include: { biodata: true, pendidikan: true, dokumen: true, verifikasi: true },
      orderBy: { submittedAt: "asc" },
    });
    return list as any;
  }

  async getWawancaraQueue(): Promise<TransaksiRecord[]> {
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
      include: { biodata: true, pendidikan: true, dokumen: true, wawancara: true },
      orderBy: { updatedAt: "desc" },
    });
    return list as any;
  }

  async getAll(): Promise<TransaksiRecord[]> {
    const list = await prisma.pendaftaran.findMany({
      include: { biodata: true, pendidikan: true, dokumen: true, verifikasi: true, wawancara: true },
      orderBy: { createdAt: "desc" },
    });
    return list as any;
  }

  async getStatistics() {
    const list = await this.getAll();
    return {
      totalCalonPeserta: list.length,
      totalPeserta: list.length,
      prosesAdministrasi: list.filter(
        (p) =>
          p.status === StatusPendaftaran.SUBMITTED ||
          p.status === StatusPendaftaran.DALAM_PROSES_ADMIN ||
          p.status === StatusPendaftaran.REVISI
      ).length,
      lolosAdministrasi: list.filter(
        (p) =>
          p.status === StatusPendaftaran.LOLOS_ADMIN ||
          p.status === StatusPendaftaran.DALAM_PROSES_WAWANCARA ||
          p.status === StatusPendaftaran.LULUS_DITERIMA
      ).length,
      gugurAdministrasi: list.filter(
        (p) => p.status === StatusPendaftaran.TIDAK_LOLOS_ADMIN
      ).length,
      prosesWawancara: list.filter(
        (p) => p.status === StatusPendaftaran.LOLOS_ADMIN && !p.wawancara?.nilaiWawancara
      ).length,
      lulusWawancara: list.filter((p) => p.status === StatusPendaftaran.LULUS_DITERIMA).length,
      gagalWawancara: list.filter(
        (p) => p.status === StatusPendaftaran.TIDAK_LULUS_WAWANCARA
      ).length,
    };
  }
}

export const repository = new TransaksiRepository();
