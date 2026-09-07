import "dotenv/config";
import fastifyCors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { auth } from "./auth.js";
import { rbacRepository } from "./repository.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";
await fastify.register(fastifyCors, {
  origin: [CORS_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-Id",
    "X-User-Role",
    "X-Internal-Secret",
  ],
  credentials: true,
});

// 1. Health check
fastify.get("/health", async () => {
  return {
    status: "ok",
    service: "service-rbac",
    timestamp: new Date().toISOString(),
  };
});

// 2. Better-Auth Handler
fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request: FastifyRequest, reply: FastifyReply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      fastify.log.error({ err: error }, "Authentication Error:");
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

// 3. Current User Profile & Role Check
fastify.get("/api/rbac/me", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string | undefined;
  if (!userId) {
    return reply.status(401).send({ error: "Identitas pengguna tidak ditemukan." });
  }

  const user = await rbacRepository.findUserById(userId);

  if (!user) {
    return reply.status(404).send({ error: "Pengguna tidak ditemukan." });
  }

  return user;
});

// 4. Dynamic Menu Retrieval by User Role
fastify.get("/api/rbac/me/menus", async (request) => {
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  return rbacRepository.getMenusByRole(userRole);
});

// 5. User Management (Admin Only)
fastify.get("/api/rbac/users", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak." });
  }

  return rbacRepository.getAllUsers();
});

// 6. Roles & Permissions List
fastify.get("/api/rbac/roles", async () => {
  return [
    {
      id: "role-1",
      name: "applicant",
      description: "Peserta Calon Penerima Beasiswa",
      accessibleMenus: ["Dashboard Beasiswa"],
    },
    {
      id: "role-2",
      name: "verifikator",
      description: "Verifikator Seleksi Administrasi",
      accessibleMenus: ["Verifikasi Seleksi Administrasi"],
    },
    {
      id: "role-3",
      name: "interviewer",
      description: "Lembaga / Tim Penguji Wawancara",
      accessibleMenus: ["Proses Wawancara"],
    },
    {
      id: "role-4",
      name: "admin",
      description: "Administrator Sistem Beasiswa",
      accessibleMenus: ["Dashboard", "Hasil Seleksi", "Data Master", "Setting System"],
    },
  ];
});

const PORT = Number(process.env.PORT) || 3001;
await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 Service RBAC berjalan pada http://0.0.0.0:${PORT}`);
