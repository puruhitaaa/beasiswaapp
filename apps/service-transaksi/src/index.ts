import "dotenv/config";
import {
  StatusPendaftaran,
  StatusVerifikasi,
  StatusWawancara,
} from "@beasiswaapp/contracts";
import fastifyCors from "@fastify/cors";
import Fastify from "fastify";
import { prisma } from "./db.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

const MASTER_SERVICE_URL =
  process.env.MASTER_SERVICE_URL || "http://127.0.0.1:3012";
const INTERNAL_SECRET =
  process.env.INTERNAL_CLUSTER_SECRET || "cluster-shared-secret-key";

await fastify.register(fastifyCors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-Id",
    "X-User-Role",
    "X-Internal-Secret",
  ],
});

// 1. Health check
fastify.get("/health", async () => {
  return {
    status: "ok",
    service: "service-transaksi",
    timestamp: new Date().toISOString(),
  };
});

// Helper: Anti-IDOR Ownership check
async function checkApplicationAccess(
  pendaftaranId: string,
  userId: string,
  userRole: string
) {
  const pendaftaran = await prisma.pendaftaran.findUnique({
    where: { id: pendaftaranId },
    include: {
      biodata: true,
      pendidikan: true,
      verifikasi: true,
      wawancara: true,
    },
  });

  if (!pendaftaran) return { error: "Permohonan tidak ditemukan.", status: 404 };

  if (
    userRole === "applicant" &&
    pendaftaran.userId !== userId
  ) {
    return { error: "Akses ditolak. Bukan permohonan milik Anda.", status: 403 };
  }

  return { data: pendaftaran };
}

// 2. Create Application Draft
fastify.post("/api/transaksi/pendaftaran", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  if (!userId) {
    return reply.status(401).send({ error: "Silakan masuk terlebih dahulu." });
  }

  const { beasiswaId } = request.body as { beasiswaId: string };
  if (!beasiswaId) {
    return reply.status(400).send({ error: "beasiswaId wajib disertakan." });
  }

  // Synchronous Write-Path HTTP Validation to Master Service
  try {
    const masterRes = await fetch(
      `${MASTER_SERVICE_URL}/internal/beasiswa/${beasiswaId}`,
      {
        headers: { "x-internal-secret": INTERNAL_SECRET },
      }
    );

    if (!masterRes.ok) {
      return reply.status(400).send({ error: "Beasiswa tidak valid atau tidak ditemukan." });
    }

    const masterData = (await masterRes.json()) as any;
    if (!masterData.isOpen) {
      return reply.status(400).send({ error: "Pendaftaran beasiswa ini telah ditutup." });
    }

    // Generate unique application code
    const count = await prisma.pendaftaran.count();
    const currentYear = new Date().getFullYear();
    const kodePermohonan = `PRM-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const created = await prisma.pendaftaran.create({
      data: {
        kodePermohonan,
        userId,
        beasiswaId,
        beasiswaNamaSnapshot: masterData.namaPelatihan,
        status: StatusPendaftaran.DRAFT,
        stepWizardTerakhir: 1,
      },
    });

    return reply.status(201).send(created);
  } catch (err) {
    fastify.log.error(err, "Failed to connect to master service");
    return reply.status(500).send({ error: "Gagal memvalidasi data master beasiswa." });
  }
});

// 3. Get Application Details (Resume Later Resolver)
fastify.get("/api/transaksi/pendaftaran/:id", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  return access.data;
});

// 4. Immediate Step Persistence (Save on Next)
fastify.put("/api/transaksi/pendaftaran/:id/step/:stepNumber", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id, stepNumber } = request.params as { id: string; stepNumber: string };
  const step = Number(stepNumber);

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  const pendaftaran = access.data!;
  // State locking check: Only DRAFT and REVISI can be edited
  if (
    pendaftaran.status !== StatusPendaftaran.DRAFT &&
    pendaftaran.status !== StatusPendaftaran.REVISI
  ) {
    return reply.status(403).send({
      error: "Formulir terkunci penuh (Read-Only) karena telah dikirimkan.",
    });
  }

  const body = request.body as any;

  if (step === 1) {
    await prisma.biodataPendaftar.upsert({
      where: { pendaftaranId: id },
      create: {
        pendaftaranId: id,
        nik: body.nik,
        namaLengkap: body.namaLengkap,
        tglLahir: body.tglLahir,
        alamat: body.alamat,
        noHp: body.noHp,
        noWa: body.noWa,
        email: body.email,
      },
      update: {
        nik: body.nik,
        namaLengkap: body.namaLengkap,
        tglLahir: body.tglLahir,
        alamat: body.alamat,
        noHp: body.noHp,
        noWa: body.noWa,
        email: body.email,
      },
    });
  } else if (step === 2) {
    await prisma.riwayatPendidikanPekerjaan.upsert({
      where: { pendaftaranId: id },
      create: {
        pendaftaranId: id,
        pendidikanTerakhir: body.pendidikanTerakhir,
        namaInstansi: body.namaInstansi,
        jurusan: body.jurusan,
        pekerjaanSaatIni: body.pekerjaanSaatIni,
      },
      update: {
        pendidikanTerakhir: body.pendidikanTerakhir,
        namaInstansi: body.namaInstansi,
        jurusan: body.jurusan,
        pekerjaanSaatIni: body.pekerjaanSaatIni,
      },
    });
  }

  const nextStepMax = Math.max(pendaftaran.stepWizardTerakhir, Math.min(step + 1, 4));
  const updated = await prisma.pendaftaran.update({
    where: { id },
    data: {
      stepWizardTerakhir: nextStepMax,
    },
    include: {
      biodata: true,
      pendidikan: true,
    },
  });

  return updated;
});

// 5. Final Submit (Transition to SUBMITTED & Lock Form)
fastify.post("/api/transaksi/pendaftaran/:id/submit", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  const pendaftaran = access.data!;
  if (!pendaftaran.biodata || !pendaftaran.pendidikan) {
    return reply.status(400).send({
      error: "Harap lengkapi semua tahapan pendaftaran sebelum melakukan pengiriman final.",
    });
  }

  const updated = await prisma.pendaftaran.update({
    where: { id },
    data: {
      status: StatusPendaftaran.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  return {
    success: true,
    message: "Pendaftaran berhasil dikirimkan dan masuk antrean verifikasi administrasi.",
    data: updated,
  };
});

// 6. Verifikator: List Queue
fastify.get("/api/transaksi/admin/verifikasi", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "verifikator" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses verifikator diperlukan." });
  }

  return prisma.pendaftaran.findMany({
    where: {
      status: {
        in: [StatusPendaftaran.SUBMITTED, StatusPendaftaran.DALAM_PROSES_ADMIN],
      },
    },
    include: { biodata: true, pendidikan: true },
    orderBy: { submittedAt: "asc" },
  });
});

// 7. Verifikator: Decision
fastify.post("/api/transaksi/admin/verifikasi/:id", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "verifikator" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses verifikator diperlukan." });
  }

  const { id } = request.params as { id: string };
  const body = request.body as any;

  let newStatus: string = StatusPendaftaran.DALAM_PROSES_ADMIN;
  if (body.statusKeputusan === StatusVerifikasi.DITERIMA) {
    newStatus = StatusPendaftaran.LOLOS_ADMIN;
  } else if (body.statusKeputusan === StatusVerifikasi.PERLU_REVISI) {
    newStatus = StatusPendaftaran.REVISI;
  } else if (body.statusKeputusan === StatusVerifikasi.DITOLAK) {
    newStatus = StatusPendaftaran.TIDAK_LOLOS_ADMIN;
  }

  await prisma.$transaction([
    prisma.verifikasiAdministrasi.upsert({
      where: { pendaftaranId: id },
      create: {
        pendaftaranId: id,
        verifikatorId: userId,
        checklistKtp: body.checklistKtp ?? false,
        checklistKk: body.checklistKk ?? false,
        checklistIjazah: body.checklistIjazah ?? false,
        checklistRekomendasi: body.checklistRekomendasi ?? false,
        catatanRevisi: body.catatanRevisi || null,
        statusKeputusan: body.statusKeputusan,
      },
      update: {
        verifikatorId: userId,
        checklistKtp: body.checklistKtp ?? false,
        checklistKk: body.checklistKk ?? false,
        checklistIjazah: body.checklistIjazah ?? false,
        checklistRekomendasi: body.checklistRekomendasi ?? false,
        catatanRevisi: body.catatanRevisi || null,
        statusKeputusan: body.statusKeputusan,
        verifiedAt: new Date(),
      },
    }),
    prisma.pendaftaran.update({
      where: { id },
      data: { status: newStatus },
    }),
  ]);

  return { success: true, message: `Status permohonan diperbarui menjadi ${newStatus}.` };
});

// 8. Interviewer: Scoring & Final Assessment
fastify.post("/api/transaksi/interviewer/penilaian/:id", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "interviewer" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses pewawancara diperlukan." });
  }

  const { id } = request.params as { id: string };
  const body = request.body as any;

  const newStatus =
    body.statusHasil === StatusWawancara.LULUS
      ? StatusPendaftaran.LULUS_DITERIMA
      : StatusPendaftaran.TIDAK_LULUS_WAWANCARA;

  await prisma.$transaction([
    prisma.penilaianWawancara.upsert({
      where: { pendaftaranId: id },
      create: {
        pendaftaranId: id,
        interviewerId: userId,
        nilaiWawancara: Number(body.nilaiWawancara),
        catatanEvaluasi: body.catatanEvaluasi,
        statusHasil: body.statusHasil,
      },
      update: {
        interviewerId: userId,
        nilaiWawancara: Number(body.nilaiWawancara),
        catatanEvaluasi: body.catatanEvaluasi,
        statusHasil: body.statusHasil,
        evaluatedAt: new Date(),
      },
    }),
    prisma.pendaftaran.update({
      where: { id },
      data: { status: newStatus },
    }),
  ]);

  return {
    success: true,
    message: `Penilaian berhasil disimpan. Status permohonan: ${newStatus}.`,
  };
});

const PORT = Number(process.env.PORT) || 3003;
await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 Service Transaksi berjalan pada http://0.0.0.0:${PORT}`);
