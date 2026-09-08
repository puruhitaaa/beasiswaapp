import "dotenv/config";
import cookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { verifyPassword } from "better-auth/crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { SignJWT, jwtVerify } from "jose";
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

await fastify.register(cookie);

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

// Short-lived Access Token (15 minutes per ADR-005)
async function generateAccessToken(user: { id: string; email: string; name: string; role: string }) {
  return new SignJWT({
    userId: user.id,
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    tokenType: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

// Long-lived Refresh Session Token (7 days per ADR-005)
async function generateSessionToken(user: { id: string; email: string; name: string; role: string }) {
  return new SignJWT({
    userId: user.id,
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    tokenType: "session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

function setAuthCookies(reply: FastifyReply, sessionToken: string) {
  reply.setCookie("better-auth.session_token", sessionToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
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

    const accessToken = await generateAccessToken(user);
    const sessionToken = await generateSessionToken(user);
    setAuthCookies(reply, sessionToken);

    const userWithNik = {
      ...user,
      nik: nik || (user.id.startsWith("user-") ? user.id.replace("user-", "") : undefined),
    };
    return reply.status(201).send({ token: accessToken, user: userWithNik });
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

    const accessToken = await generateAccessToken(tokenUser);
    const sessionToken = await generateSessionToken(tokenUser);
    setAuthCookies(reply, sessionToken);

    return { token: accessToken, user: tokenUser };
  } catch (err: any) {
    fastify.log.error({ err }, "Login error:");
    return reply.status(500).send({ error: "Terjadi kesalahan saat memverifikasi autentikasi." });
  }
});

// 4. Token generation & silent refresh endpoint (reads HttpOnly session cookie or credentials)
fastify.post("/api/auth/token", async (request, reply) => {
  const body = (request.body || {}) as any;
  const email = body.email;
  const password = body.password;

  // A. If session cookie exists, perform silent refresh
  const cookieSessionToken = request.cookies?.["better-auth.session_token"];
  if (cookieSessionToken && !password) {
    try {
      const { payload } = await jwtVerify(cookieSessionToken, JWT_SECRET);
      const userId = String(payload.sub || payload.userId || "");
      if (userId) {
        const user = await rbacRepository.findUserById(userId);
        if (user) {
          const tokenUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "applicant",
          };
          const newAccessToken = await generateAccessToken(tokenUser);
          const newSessionToken = await generateSessionToken(tokenUser);
          setAuthCookies(reply, newSessionToken);
          return { token: newAccessToken, user: tokenUser };
        }
      }
    } catch {
      // Expired or invalid cookie, proceed to other checks
    }
  }

  // B. If password provided, do real authentication
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
      const accessToken = await generateAccessToken(tokenUser);
      const sessionToken = await generateSessionToken(tokenUser);
      setAuthCookies(reply, sessionToken);
      return { token: accessToken, user: tokenUser };
    }
  }

  // C. Fallback lookup by email from database
  if (email) {
    const user = await rbacRepository.findUserWithAuthByEmail(email);
    if (user) {
      const tokenUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.name || body.role || "applicant",
      };
      const accessToken = await generateAccessToken(tokenUser);
      const sessionToken = await generateSessionToken(tokenUser);
      setAuthCookies(reply, sessionToken);
      return { token: accessToken, user: tokenUser };
    }
  }

  return reply.status(401).send({ error: "Kredensial atau sesi tidak ditemukan di database." });
});

// 4b. Explicit silent refresh endpoint
fastify.post("/api/auth/refresh", async (request, reply) => {
  const cookieSessionToken =
    request.cookies?.["better-auth.session_token"] ||
    (request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.substring(7)
      : undefined);

  if (!cookieSessionToken) {
    return reply.status(401).send({ error: "Sesi tidak ditemukan atau telah berakhir." });
  }

  try {
    const { payload } = await jwtVerify(cookieSessionToken, JWT_SECRET);
    const userId = String(payload.sub || payload.userId || "");
    const user = await rbacRepository.findUserById(userId);
    if (!user) {
      return reply.status(401).send({ error: "Pengguna tidak ditemukan." });
    }

    const tokenUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "applicant",
    };
    const newAccessToken = await generateAccessToken(tokenUser);
    const newSessionToken = await generateSessionToken(tokenUser);
    setAuthCookies(reply, newSessionToken);

    return { token: newAccessToken, user: tokenUser };
  } catch {
    return reply.status(401).send({ error: "Sesi kedaluwarsa. Silakan masuk kembali." });
  }
});

// 4c. Logout Endpoint (Clears HttpOnly session cookie)
fastify.post("/api/auth/logout", async (_request, reply) => {
  reply.clearCookie("better-auth.session_token", { path: "/" });
  return { success: true, message: "Berhasil keluar." };
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
