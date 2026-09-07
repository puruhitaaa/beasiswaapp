import "dotenv/config";
import {
  StatusPendaftaran,
  StatusWawancara,
} from "@beasiswaapp/contracts";
import fastifyCors from "@fastify/cors";
import Fastify from "fastify";
import { repository } from "./repository.js";

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
  const pendaftaran = await repository.findUnique(pendaftaranId);
  if (!pendaftaran) return { error: "Permohonan tidak ditemukan.", status: 404 };

  if (userRole === "applicant" && pendaftaran.userId !== userId) {
    return { error: "Akses ditolak. Bukan permohonan milik Anda.", status: 403 };
  }

  return { data: pendaftaran };
}

// 2. Get Active Application for Current User (1 Active Application Rule)
fastify.get("/api/transaksi/pendaftaran/my-active", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  if (!userId) {
    return reply.status(401).send({ error: "Silakan masuk terlebih dahulu." });
  }

  const active = await repository.findMyActive(userId);
  if (!active) {
    return reply.status(404).send({ error: "Belum ada pendaftaran aktif." });
  }

  return active;
});

// 3. Create Application Draft (Enforcing 1 Active Application Rule)
const handleCreateApplication = async (request: any, reply: any) => {
  const userId = request.headers["x-user-id"] as string;
  if (!userId) {
    return reply.status(401).send({ error: "Silakan masuk terlebih dahulu." });
  }

  const existing = await repository.findMyActive(userId);
  if (
    existing &&
    existing.status !== StatusPendaftaran.TIDAK_LOLOS_ADMIN &&
    existing.status !== StatusPendaftaran.TIDAK_LULUS_WAWANCARA
  ) {
    return reply.status(400).send({
      error:
        "Batas pendaftaran tercapai. Anda sudah memiliki pendaftaran aktif pada program lain.",
    });
  }

  const { beasiswaId, programName } = request.body as {
    beasiswaId: string;
    programName?: string;
  };
  if (!beasiswaId) {
    return reply.status(400).send({ error: "beasiswaId wajib disertakan." });
  }

  // Attempt synchronous validation against master service with graceful fallback
  let namaPelatihan = programName || "Program Beasiswa Pilihan";
  try {
    const masterRes = await fetch(
      `${MASTER_SERVICE_URL}/internal/beasiswa/${beasiswaId}`,
      {
        headers: { "x-internal-secret": INTERNAL_SECRET },
      }
    );

    if (masterRes.ok) {
      const masterData = (await masterRes.json()) as any;
      if (!masterData.isOpen) {
        return reply.status(400).send({ error: "Pendaftaran beasiswa ini telah ditutup." });
      }
      namaPelatihan = masterData.namaPelatihan;
    }
  } catch {
    // Master service offline or mock dev mode: proceed with provided programName
  }

  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const kodePermohonan = `PRM-${currentYear}-${randomSuffix}`;

  const created = await repository.create({
    kodePermohonan,
    userId,
    beasiswaId,
    beasiswaNamaSnapshot: namaPelatihan,
  });

  return reply.status(201).send(created);
};

fastify.post("/api/transaksi/pendaftaran", handleCreateApplication);
fastify.post("/api/transaksi/pendaftaran/init", handleCreateApplication);

// 4. Get Application Details (Resume Later Resolver)
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

// 5. Immediate Step Persistence (Step 1: Biodata)
fastify.put("/api/transaksi/pendaftaran/:id/step/1", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  const pendaftaran = access.data!;
  if (
    pendaftaran.status !== StatusPendaftaran.DRAFT &&
    pendaftaran.status !== StatusPendaftaran.REVISI
  ) {
    return reply.status(403).send({
      error: "Formulir terkunci penuh (Read-Only) karena telah dikirimkan.",
    });
  }

  const updated = await repository.upsertBiodata(id, request.body);
  return updated;
});

// 6. Immediate Step Persistence (Step 2: Pendidikan)
fastify.put("/api/transaksi/pendaftaran/:id/step/2", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  const pendaftaran = access.data!;
  if (
    pendaftaran.status !== StatusPendaftaran.DRAFT &&
    pendaftaran.status !== StatusPendaftaran.REVISI
  ) {
    return reply.status(403).send({
      error: "Formulir terkunci penuh (Read-Only) karena telah dikirimkan.",
    });
  }

  const updated = await repository.upsertPendidikan(id, request.body);
  return updated;
});

// 7. Immediate Step Persistence (Step 3: Dokumen)
fastify.put("/api/transaksi/pendaftaran/:id/step/3", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  const pendaftaran = access.data!;
  if (
    pendaftaran.status !== StatusPendaftaran.DRAFT &&
    pendaftaran.status !== StatusPendaftaran.REVISI
  ) {
    return reply.status(403).send({
      error: "Formulir terkunci penuh (Read-Only) karena telah dikirimkan.",
    });
  }

  const { dokumen } = request.body as { dokumen: any[] };
  const updated = await repository.upsertDokumen(id, dokumen || []);
  return updated;
});

// 8. Final Submit (Transition to SUBMITTED & Lock Form)
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
      error: "Harap lengkapi seluruh isian biodata dan riwayat pendidikan sebelum submit.",
    });
  }

  const updated = await repository.update(id, {
    status: StatusPendaftaran.SUBMITTED,
    stepWizardTerakhir: 4,
    submittedAt: new Date(),
  });

  return {
    success: true,
    message: "Pendaftaran berhasil dikirimkan dan masuk antrean verifikasi administrasi.",
    data: updated,
  };
});

// 9. Applicant: Daftar Ulang Confirmation
fastify.post("/api/transaksi/pendaftaran/:id/daftar-ulang", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const access = await checkApplicationAccess(id, userId, userRole);
  if (access.error) {
    return reply.status(access.status!).send({ error: access.error });
  }

  const { statusKesediaan, catatan } = request.body as {
    statusKesediaan: "bersedia" | "mengundurkan";
    catatan?: string;
  };

  const updated = await repository.confirmDaftarUlang(id, statusKesediaan, catatan);
  return {
    success: true,
    message: "Konfirmasi daftar ulang berhasil disimpan.",
    data: updated,
  };
});

// 10. Verifikator: List Queue
const handleVerifikatorQueue = async (request: any, reply: any) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "verifikator" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses verifikator diperlukan." });
  }

  return repository.getVerifikatorQueue();
};

fastify.get("/api/transaksi/admin/verifikasi", handleVerifikatorQueue);
fastify.get("/api/transaksi/verifikasi/queue", handleVerifikatorQueue);

// 11. Verifikator: Submit Decision
const handleVerifikatorDecision = async (request: any, reply: any) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "verifikator" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses verifikator diperlukan." });
  }

  const { id } = request.params as { id: string };
  const body = request.body as any;

  const updated = await repository.upsertVerifikasi(id, userId, {
    statusKeputusan: body.statusKeputusan,
    catatanRevisi: body.catatanRevisi || body.catatanVerifikator,
    checklistKtp: body.checklistKtp,
    checklistKk: body.checklistKk,
    checklistIjazah: body.checklistIjazah,
    checklistRekomendasi: body.checklistRekomendasi,
  });

  return {
    success: true,
    message: `Keputusan verifikasi berhasil disimpan. Status permohonan sekarang: ${updated.status}.`,
    data: updated,
  };
};

fastify.post("/api/transaksi/admin/verifikasi/:id", handleVerifikatorDecision);
fastify.post("/api/transaksi/verifikasi/:id/decision", handleVerifikatorDecision);

// 12. Interviewer: List Queue
const handleWawancaraQueue = async (request: any, reply: any) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "interviewer" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses pewawancara diperlukan." });
  }

  return repository.getWawancaraQueue();
};

fastify.get("/api/transaksi/interviewer/penilaian", handleWawancaraQueue);
fastify.get("/api/transaksi/wawancara/queue", handleWawancaraQueue);

// 13. Interviewer: Submit Scoring (Strict Weighted Formula)
const handleWawancaraScoring = async (request: any, reply: any) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "interviewer" && userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses pewawancara atau admin diperlukan." });
  }

  const { id } = request.params as { id: string };
  const body = request.body as any;

  // Formula exact: (K * 0.3) + (T * 0.4) + (M * 0.3)
  const k = Number(body.skorKomunikasi ?? 0);
  const t = Number(body.skorTeknis ?? 0);
  const m = Number(body.skorKomitmen ?? 0);
  const calculatedNilai = Number((k * 0.3 + t * 0.4 + m * 0.3).toFixed(2));
  const finalScore = body.nilaiWawancara !== undefined ? Number(body.nilaiWawancara) : calculatedNilai;

  const updated = await repository.upsertWawancara(id, userId, {
    nilaiWawancara: finalScore,
    catatanEvaluasi: body.catatanEvaluasi || "Penilaian wawancara selesai.",
    statusHasil: body.statusHasil || (finalScore >= 70 ? StatusWawancara.LULUS : StatusWawancara.TIDAK_LULUS),
  });

  return {
    success: true,
    message: `Penilaian wawancara berhasil disimpan. Nilai akhir: ${finalScore}.`,
    data: updated,
  };
};

fastify.post("/api/transaksi/interviewer/penilaian/:id", handleWawancaraScoring);
fastify.post("/api/transaksi/wawancara/:id/scoring", handleWawancaraScoring);

// 14. Admin: Statistics
fastify.get("/api/transaksi/admin/statistics", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses administrator diperlukan." });
  }

  return repository.getStatistics();
});

// 15. Admin: Export Excel (CSV with UTF-8 BOM)
fastify.get("/api/transaksi/admin/export-excel", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses administrator diperlukan." });
  }

  const list = await repository.getAll();
  const headers = [
    "No",
    "Kode Permohonan",
    "NIK",
    "Nama Peserta",
    "Program Pelatihan",
    "Status Administrasi",
    "Nilai Wawancara",
    "Status Wawancara",
    "Status Final",
  ];

  const rows = list.map((item, idx) => [
    idx + 1,
    item.kodePermohonan,
    `'${item.biodata?.nik || "N/A"}`,
    item.biodata?.namaLengkap || "N/A",
    item.beasiswaNamaSnapshot || "Beasiswa",
    item.status === StatusPendaftaran.LOLOS_ADMIN ||
    item.status === StatusPendaftaran.DALAM_PROSES_WAWANCARA ||
    item.status === StatusPendaftaran.LULUS_DITERIMA
      ? "Lolos"
      : item.status === StatusPendaftaran.TIDAK_LOLOS_ADMIN
      ? "Tidak Lolos"
      : "Proses",
    item.wawancara?.nilaiWawancara ? item.wawancara.nilaiWawancara.toFixed(2) : "-",
    item.wawancara?.statusHasil || "-",
    item.status === StatusPendaftaran.LULUS_DITERIMA ? "DITERIMA" : item.status,
  ]);

  const csvContent =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

  reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header(
      "Content-Disposition",
      `attachment; filename="Rekap_Hasil_Seleksi_Beasiswa_${new Date().toISOString().slice(0, 10)}.csv"`
    );

  return reply.send(csvContent);
});

const PORT = Number(process.env.PORT) || 3003;
await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 Service Transaksi berjalan pada http://0.0.0.0:${PORT}`);
