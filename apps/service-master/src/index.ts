import "dotenv/config";
import fastifyCors from "@fastify/cors";
import Fastify from "fastify";
import { masterRepository } from "./repository.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

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
    service: "service-master",
    timestamp: new Date().toISOString(),
  };
});

// 2. Public Catalogue: List Active Scholarships
fastify.get("/api/master/beasiswa", async () => {
  return masterRepository.findAllActive();
});

// 3. Scholarship Details
fastify.get("/api/master/beasiswa/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const beasiswa = await masterRepository.findById(id);

  if (!beasiswa || !beasiswa.isActive) {
    return reply.status(404).send({ error: "Beasiswa tidak ditemukan atau sudah ditutup." });
  }

  return beasiswa;
});

// 4. Internal Validation Lookup (Called by service-transaksi during application creation)
fastify.get("/internal/beasiswa/:id", async (request, reply) => {
  const secret = request.headers["x-internal-secret"];
  if (secret !== INTERNAL_SECRET) {
    return reply.status(403).send({ error: "Akses internal tidak sah." });
  }

  const { id } = request.params as { id: string };
  const beasiswa = await masterRepository.findById(id);

  if (!beasiswa) {
    return reply.status(404).send({ error: "Beasiswa tidak ditemukan." });
  }

  const now = new Date();
  const isOpen =
    beasiswa.isActive &&
    now >= beasiswa.tglMulaiDaftar &&
    now <= beasiswa.tglSelesaiDaftar;

  return {
    id: beasiswa.id,
    kodeBeasiswa: beasiswa.kodeBeasiswa,
    namaPelatihan: beasiswa.namaPelatihan,
    kuota: beasiswa.kuota,
    isOpen,
    persyaratan: beasiswa.persyaratan,
  };
});

// 5. Admin: Create Scholarship & Requirements
fastify.post("/api/master/beasiswa", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak." });
  }

  const body = request.body as any;
  const created = await masterRepository.create({
    kodeBeasiswa: body.kodeBeasiswa,
    namaPelatihan: body.namaPelatihan,
    deskripsi: body.deskripsi,
    kuota: Number(body.kuota),
    tglMulaiDaftar: new Date(body.tglMulaiDaftar || Date.now()),
    tglSelesaiDaftar: new Date(body.tglSelesaiDaftar || "2026-12-31"),
    persyaratan: body.persyaratan || [],
  });

  return reply.status(201).send(created);
});

// 6. Admin: Soft Delete Scholarship
fastify.delete("/api/master/beasiswa/:id", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak." });
  }

  const { id } = request.params as { id: string };
  const ok = await masterRepository.softDelete(id);

  if (!ok) {
    return reply.status(404).send({ error: "Beasiswa tidak ditemukan." });
  }

  return { success: true, message: "Beasiswa berhasil dinonaktifkan." };
});

const PORT = Number(process.env.PORT) || 3002;
await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 Service Master berjalan pada http://0.0.0.0:${PORT}`);
