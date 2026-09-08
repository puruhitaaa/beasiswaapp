import "dotenv/config";
import fastifyCors from "@fastify/cors";
import { verifyPassword } from "better-auth/crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { SignJWT } from "jose";
import { auth } from "./auth.js";
import { rbacRepository } from "./repository.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Gracefully handle empty JSON bodies to prevent FST_ERR_CTP_EMPTY_JSON_BODY
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (_req, body, done) => {
    if (!body || (typeof body === "string" && body.trim().length === 0)) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  }
);

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

const JWT_SECRET = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET || "default-secret-key-min-32-chars-fallback"
);

// Helper to create JWT token
async function generateToken(user: { id: string; email: string; name: string; role: string }) {
  return new SignJWT({
    userId: user.id,
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// 2. Register Endpoint (Public)
fastify.post("/api/auth/register", async (request, reply) => {
  const body = (request.body || {}) as any;
  const { nik, name, email, password } = body;

  if (!email || !password || !name) {
    return reply.status(400).send({ error: "Nama, email, dan kata sandi wajib diisi." });
  }

  if (password.length < 6) {
    return reply.status(400).send({ error: "Kata sandi minimal 6 karakter." });
  }

  const existing = await rbacRepository.findUserWithAuthByEmail(email);
  if (existing) {
    return reply.status(400).send({ error: "Alamat email sudah terdaftar. Silakan masuk." });
  }

  try {
    const userId = nik ? `user-${nik}` : undefined;
    const user = await rbacRepository.createUserWithAccount({
      id: userId,
      name,
      email,
      passwordRaw: password,
      roleName: "applicant",
    });

    const token = await generateToken(user);
    const userWithNik = {
      ...user,
      nik: nik || (user.id.startsWith("user-") ? user.id.replace("user-", "") : undefined),
    };
    return reply.status(201).send({ token, user: userWithNik });
  } catch (err: any) {
    fastify.log.error({ err }, "Registration error:");
    return reply.status(500).send({ error: err.message || "Gagal mendaftarkan akun." });
  }
});

// 3. Login Endpoint (Public)
fastify.post("/api/auth/login", async (request, reply) => {
  const body = (request.body || {}) as any;
  const { email, password, role } = body;

  if (!email || !password) {
    return reply.status(400).send({ error: "Email/ID Pengguna dan kata sandi wajib diisi." });
  }

  try {
    const user = await rbacRepository.findUserWithAuthByEmail(email);
    if (!user) {
      return reply.status(401).send({ error: "Akun tidak ditemukan. Periksa kembali email Anda." });
    }

    const credentialAccount = user.accounts.find((a) => a.providerId === "credential" || a.password);
    if (!credentialAccount || !credentialAccount.password) {
      return reply.status(401).send({ error: "Metode autentikasi tidak sah untuk akun ini." });
    }

    const isValid = await verifyPassword({
      hash: credentialAccount.password,
      password,
    });

    if (!isValid) {
      return reply.status(401).send({ error: "Kata sandi salah. Silakan coba lagi." });
    }

    const userRole = user.role?.name || "applicant";

    // Enforce role check if specific portal login
    if (role && role !== userRole && userRole !== "superadmin") {
      return reply.status(403).send({
        error: `Akun ini tidak memiliki hak akses sebagai ${role.toUpperCase()}.`,
      });
    }

    const tokenUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: userRole,
    };

    const token = await generateToken(tokenUser);
    return { token, user: tokenUser };
  } catch (err: any) {
    fastify.log.error({ err }, "Login error:");
    return reply.status(500).send({ error: "Terjadi kesalahan saat memverifikasi autentikasi." });
  }
});

// 4. Token generation endpoint (Backward compatibility & token refresh)
fastify.post("/api/auth/token", async (request, reply) => {
  const body = (request.body || {}) as any;
  const email = body.email;
  const password = body.password;

  // If password provided, do real authentication
  if (password && email) {
    const user = await rbacRepository.findUserWithAuthByEmail(email);
    if (user) {
      const cred = user.accounts.find((a) => a.providerId === "credential" || a.password);
      if (cred?.password) {
        const ok = await verifyPassword({ hash: cred.password, password });
        if (!ok) {
          return reply.status(401).send({ error: "Kata sandi salah." });
        }
      }
      const tokenUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.name || "applicant",
      };
      const token = await generateToken(tokenUser);
      return { token, user: tokenUser };
    }
  }

  // Fallback lookup by email from database
  if (email) {
    const user = await rbacRepository.findUserWithAuthByEmail(email);
    if (user) {
      const tokenUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.name || body.role || "applicant",
      };
      const token = await generateToken(tokenUser);
      return { token, user: tokenUser };
    }
  }

  return reply.status(401).send({ error: "Kredensial atau akun tidak ditemukan di database." });
});

// 5. Better-Auth Handler (Passthrough)
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

// 6. Current User Profile
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

// 7. Dynamic Menu Retrieval by User Role
fastify.get("/api/rbac/me/menus", async (request) => {
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  return rbacRepository.getMenusByRole(userRole);
});

// 8. User Management (Admin Only)
fastify.get("/api/rbac/users", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak. Hak administrator diperlukan." });
  }

  return rbacRepository.getAllUsers();
});

fastify.post("/api/rbac/users", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak. Hak administrator diperlukan." });
  }

  const body = (request.body || {}) as any;
  const { name, email, password, role } = body;

  if (!name || !email) {
    return reply.status(400).send({ error: "Nama dan email wajib diisi." });
  }

  const existing = await rbacRepository.findUserWithAuthByEmail(email);
  if (existing) {
    return reply.status(400).send({ error: "Email sudah terdaftar." });
  }

  try {
    const created = await rbacRepository.createUserWithAccount({
      name,
      email,
      passwordRaw: password || "Petugas123!",
      roleName: role || "verifikator",
    });

    return reply.status(201).send(created);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message || "Gagal membuat akun petugas." });
  }
});

// 9. Roles & Permissions List
fastify.get("/api/rbac/roles", async () => {
  return rbacRepository.getAllRoles();
});

fastify.get("/api/rbac/menus", async () => {
  return rbacRepository.getAllMenus();
});

fastify.put("/api/rbac/roles/:id/permissions", async (request, reply) => {
  const userRole = request.headers["x-user-role"] as string;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return reply.status(403).send({ error: "Akses ditolak. Hak administrator diperlukan." });
  }

  const { id } = request.params as { id: string };
  const body = (request.body || {}) as any;
  const { accessibleMenus } = body;

  if (!Array.isArray(accessibleMenus)) {
    return reply.status(400).send({ error: "accessibleMenus harus berupa array nama menu." });
  }

  try {
    await rbacRepository.updateRolePermissions(id, accessibleMenus);
    return { success: true, message: "Hak akses role berhasil diperbarui." };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message || "Gagal memperbarui hak akses role." });
  }
});

const PORT = Number(process.env.PORT) || 3011;
await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 Service RBAC berjalan pada http://0.0.0.0:${PORT}`);
