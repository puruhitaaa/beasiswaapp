import "dotenv/config";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import httpProxy from "@fastify/http-proxy";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { jwtVerify } from "jose";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
  trustProxy: true,
});

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";
const JWT_SECRET = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET || "default-secret-key-min-32-chars-fallback"
);
const INTERNAL_SECRET =
  process.env.INTERNAL_CLUSTER_SECRET || "cluster-shared-secret-key";

// Upstream URL mapping with defaults for docker / host dev
const UPSTREAMS = {
  rbac: process.env.UPSTREAM_RBAC_URL || "http://127.0.0.1:3011",
  master: process.env.UPSTREAM_MASTER_URL || "http://127.0.0.1:3012",
  transaksi: process.env.UPSTREAM_TRANSAKSI_URL || "http://127.0.0.1:3013",
  dokumen: process.env.UPSTREAM_DOKUMEN_URL || "http://127.0.0.1:3014",
};

interface AuthenticatedUser {
  userId: string;
  role: string;
  email: string;
}

// 1. Strict CORS Whitelist
await app.register(cors, {
  origin: [CORS_ORIGIN, "http://localhost:5173", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

// 2. Rate Limiting: Maksimal 100 req/menit per IP di production, dinamis di test/dev
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === "production" ? 100 : 10000);
await app.register(rateLimit, {
  max: RATE_LIMIT_MAX,
  timeWindow: "1 minute",
  errorResponseBuilder: (_req, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: `Batas frekuensi permintaan terlampaui. Maksimal ${context.max} permintaan per menit.`,
  }),
});

await app.register(cookie);

// Anti-Spoofing Hook: Strip unverified identity headers sent by external clients
app.addHook("onRequest", async (req) => {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];
  delete req.headers["x-internal-secret"];
});

// Dual-Token Verification
async function authenticateUser(
  req: FastifyRequest
): Promise<AuthenticatedUser | null> {
  let token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.substring(7)
    : undefined;

  if (!token && req.cookies) {
    token =
      req.cookies["better-auth.session_token"] ||
      req.cookies["__Secure-better-auth.session_token"];
  }

  if (
    !token &&
    req.url.startsWith("/api/dokumen") &&
    req.query &&
    typeof (req.query as any).token === "string"
  ) {
    token = (req.query as any).token;
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: String(payload.sub || payload.userId || ""),
      role: String(payload.role || "applicant"),
      email: String(payload.email || ""),
    };
  } catch {
    return null;
  }
}

// Health Check Endpoint
app.get("/health", async () => {
  return {
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    upstreams: UPSTREAMS,
  };
});

// 4. Reverse Proxy Routes
// A. Auth Route (Sign in, Sign up, Session token - Public Entry to RBAC)
await app.register(httpProxy, {
  upstream: UPSTREAMS.rbac,
  prefix: "/api/auth",
  rewritePrefix: "/api/auth",
  replyOptions: {
    rewriteRequestHeaders: (_req, headers) => ({
      ...headers,
      "x-internal-secret": INTERNAL_SECRET,
    }),
  },
});

// B. RBAC Route (User profile, dynamic menus, admin roles)
await app.register(httpProxy, {
  upstream: UPSTREAMS.rbac,
  prefix: "/api/rbac",
  rewritePrefix: "/api/rbac",
  preHandler: async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticateUser(req);
    if (!user) {
      return reply
        .status(401)
        .send({ error: "Sesi tidak valid atau telah kedaluwarsa." });
    }
    req.headers["x-user-id"] = user.userId;
    req.headers["x-user-role"] = user.role;
    req.headers["x-internal-secret"] = INTERNAL_SECRET;
  },
  replyOptions: {
    rewriteRequestHeaders: (req, headers) => ({
      ...headers,
      "x-user-id": req.headers["x-user-id"] as string,
      "x-user-role": req.headers["x-user-role"] as string,
      "x-internal-secret": INTERNAL_SECRET,
    }),
  },
});

// C. Data Master Route (GET terbuka untuk umum; Mutasi wajib admin)
await app.register(httpProxy, {
  upstream: UPSTREAMS.master,
  prefix: "/api/master",
  rewritePrefix: "/api/master",
  preHandler: async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.method !== "GET" && req.method !== "OPTIONS") {
      const user = await authenticateUser(req);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return reply
          .status(403)
          .send({ error: "Hak akses administrator diperlukan." });
      }
      req.headers["x-user-id"] = user.userId;
      req.headers["x-user-role"] = user.role;
    }
    req.headers["x-internal-secret"] = INTERNAL_SECRET;
  },
  replyOptions: {
    rewriteRequestHeaders: (req, headers) => ({
      ...headers,
      ...(req.headers["x-user-id"]
        ? { "x-user-id": req.headers["x-user-id"] as string }
        : {}),
      ...(req.headers["x-user-role"]
        ? { "x-user-role": req.headers["x-user-role"] as string }
        : {}),
      "x-internal-secret": INTERNAL_SECRET,
    }),
  },
});

// D. Transaksi Route (Wizard Pendaftaran, Seleksi Administrasi, Wawancara)
await app.register(httpProxy, {
  upstream: UPSTREAMS.transaksi,
  prefix: "/api/transaksi",
  rewritePrefix: "/api/transaksi",
  preHandler: async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticateUser(req);
    if (!user) {
      return reply
        .status(401)
        .send({ error: "Silakan masuk terlebih dahulu." });
    }
    req.headers["x-user-id"] = user.userId;
    req.headers["x-user-role"] = user.role;
    req.headers["x-internal-secret"] = INTERNAL_SECRET;
  },
  replyOptions: {
    rewriteRequestHeaders: (req, headers) => ({
      ...headers,
      "x-user-id": req.headers["x-user-id"] as string,
      "x-user-role": req.headers["x-user-role"] as string,
      "x-internal-secret": INTERNAL_SECRET,
    }),
  },
});

// E. Dokumen Route (Zero-buffer multipart file streaming & authenticated access)
await app.register(httpProxy, {
  upstream: UPSTREAMS.dokumen,
  prefix: "/api/dokumen",
  rewritePrefix: "/api/dokumen",
  preHandler: async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticateUser(req);
    if (!user) {
      return reply
        .status(401)
        .send({ error: "Silakan masuk terlebih dahulu." });
    }
    req.headers["x-user-id"] = user.userId;
    req.headers["x-user-role"] = user.role;
    req.headers["x-internal-secret"] = INTERNAL_SECRET;
  },
  replyOptions: {
    rewriteRequestHeaders: (req, headers) => ({
      ...headers,
      "x-user-id": req.headers["x-user-id"] as string,
      "x-user-role": req.headers["x-user-role"] as string,
      "x-internal-secret": INTERNAL_SECRET,
    }),
  },
});

const PORT = Number(process.env.PORT) || 3000;
await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 API Gateway berjalan pada http://0.0.0.0:${PORT}`);
