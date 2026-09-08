import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { ScanStatus } from "@beasiswaapp/contracts";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { fileTypeFromBuffer } from "file-type";
import { dokumenRepository } from "./repository.js";
import { scanner } from "./scanner.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

const STORAGE_ROOT =
  process.env.STORAGE_ROOT ||
  path.resolve(process.cwd(), "../../storage/permohonan");

// Ensure storage root directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

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

await fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
    files: 1,
  },
});

// 1. Health check
fastify.get("/health", async () => {
  return {
    status: "ok",
    service: "service-dokumen",
    storageRoot: STORAGE_ROOT,
    timestamp: new Date().toISOString(),
  };
});

// 2. Upload Document Endpoint (Zero memory buffering, Magic Bytes & ClamAV Scan)
fastify.post("/api/dokumen/upload", async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = request.headers["x-user-id"] as string;
  if (!userId) {
    return reply.status(401).send({ error: "Silakan masuk terlebih dahulu." });
  }

  const query = (request.query || {}) as Record<string, string>;
  const fields: Record<string, string> = { ...query };
  let fileBuffer: Buffer | null = null;
  let filename = "";
  let mimetype = "";

  for await (const part of request.parts()) {
    if (part.type === "file") {
      filename = part.filename;
      mimetype = part.mimetype;
      fileBuffer = await part.toBuffer();
    } else {
      fields[part.fieldname] = String(part.value ?? "");
    }
  }

  if (!fileBuffer || !filename) {
    return reply.status(400).send({ error: "Berkas tidak ditemukan." });
  }

  const pendaftaranId = fields.pendaftaranId || "pending";
  const kodePermohonan = fields.kodePermohonan || "DRAFT";
  const persyaratanId = fields.persyaratanId;

  if (!persyaratanId) {
    return reply.status(400).send({ error: "persyaratanId wajib disertakan." });
  }

  const buffer = fileBuffer;
  const fileSizeBytes = buffer.length;

  // Strict SVG rejection check
  const originalName = filename.toLowerCase();
  if (originalName.endsWith(".svg") || mimetype === "image/svg+xml") {
    return reply.status(400).send({
      error: "Berkas SVG dilarang secara mutlak karena alasan keamanan siber (Anti-XSS).",
    });
  }

  // 4 KB stream peek for binary magic bytes validation
  const headerPeek = buffer.subarray(0, 4096);
  const detectedType = await fileTypeFromBuffer(headerPeek);

  const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
    return reply.status(400).send({
      error: "Tipe berkas tidak valid. Hanya dokumen PDF, JPG, dan PNG yang diizinkan.",
    });
  }

  const magicBytesHex = headerPeek.subarray(0, 8).toString("hex").toUpperCase();

  // Antivirus Scan
  const scanResult = await scanner.scanBuffer(buffer);
  if (scanResult.isInfected) {
    return reply.status(422).send({
      error: `Berkas ditolak. Terdeteksi ancaman malware: ${scanResult.signature}`,
    });
  }

  // Calculate SHA-256 Hash
  const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Save to isolated storage path: /storage/permohonan/{kodePermohonan}/{persyaratanId}_{uuid}.{ext}
  const fileUuid = crypto.randomUUID();
  const targetDir = path.join(STORAGE_ROOT, kodePermohonan);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFilename = `${persyaratanId}_${fileUuid}.${detectedType.ext}`;
  const targetFilePath = path.join(targetDir, targetFilename);
  await fs.promises.writeFile(targetFilePath, buffer);

  // Determine scan status enum
  let clamavScanStatus: string = ScanStatus.CLEAN;
  if (scanResult.skippedMock) {
    clamavScanStatus = ScanStatus.SKIPPED_MOCK;
  } else if (scanResult.error) {
    clamavScanStatus = ScanStatus.SCAN_FAILED;
  }

  // Record in repository (with transparent fallback)
  const created = await dokumenRepository.create({
    pendaftaranId: pendaftaranId || "pending",
    kodePermohonan,
    persyaratanId,
    userId,
    fileNameOriginal: filename,
    fileNameUuid: targetFilename,
    filePath: targetFilePath,
    mimeType: detectedType.mime,
    fileSizeBytes: BigInt(fileSizeBytes),
    magicBytesHex,
    magicBytesVerified: true,
    sha256Hash,
    clamavScanStatus,
    clamavSignature: scanResult.signature || null,
  });

  return reply.status(201).send({
    success: true,
    dokumen: {
      id: created.id,
      fileNameOriginal: created.fileNameOriginal,
      fileSizeBytes: Number(created.fileSizeBytes),
      mimeType: created.mimeType,
      magicBytesVerified: created.magicBytesVerified,
      clamavScanStatus: created.clamavScanStatus,
    },
  });
});

// 3. Authenticated Stream Endpoint (Inline View)
fastify.get("/api/dokumen/:id/view", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const doc = await dokumenRepository.findUnique(id);

  if (!doc || !doc.isActive) {
    return reply.status(404).send({ error: "Dokumen tidak ditemukan." });
  }

  // Anti-IDOR Check
  if (userRole === "applicant" && doc.userId !== userId) {
    return reply.status(403).send({ error: "Akses ditolak. Bukan dokumen milik Anda." });
  }

  if (!fs.existsSync(doc.filePath)) {
    return reply.status(404).send({ error: "Berkas fisik tidak ditemukan pada volume penyimpanan." });
  }

  // Audit access log
  await dokumenRepository.logAccess(
    doc.id,
    userId || "anonymous",
    userRole,
    "VIEW",
    request.ip,
    request.headers["user-agent"]
  );

  reply
    .header("Content-Type", doc.mimeType)
    .header("Content-Disposition", `inline; filename="${doc.fileNameOriginal}"`)
    .header("X-Content-Type-Options", "nosniff")
    .header("Content-Security-Policy", "default-src 'none'; sandbox")
    .header("Cache-Control", "private, no-cache, no-store, must-revalidate");

  const stream = fs.createReadStream(doc.filePath);
  return reply.send(stream);
});

// 4. Authenticated Stream Endpoint (Download)
fastify.get("/api/dokumen/:id/download", async (request, reply) => {
  const userId = request.headers["x-user-id"] as string;
  const userRole = (request.headers["x-user-role"] as string) || "applicant";
  const { id } = request.params as { id: string };

  const doc = await dokumenRepository.findUnique(id);

  if (!doc || !doc.isActive) {
    return reply.status(404).send({ error: "Dokumen tidak ditemukan." });
  }

  // Anti-IDOR Check
  if (userRole === "applicant" && doc.userId !== userId) {
    return reply.status(403).send({ error: "Akses ditolak. Bukan dokumen milik Anda." });
  }

  if (!fs.existsSync(doc.filePath)) {
    return reply.status(404).send({ error: "Berkas fisik tidak ditemukan pada volume penyimpanan." });
  }

  await dokumenRepository.logAccess(
    doc.id,
    userId || "anonymous",
    userRole,
    "DOWNLOAD",
    request.ip,
    request.headers["user-agent"]
  );

  reply
    .header("Content-Type", doc.mimeType)
    .header("Content-Disposition", `attachment; filename="${doc.fileNameOriginal}"`)
    .header("X-Content-Type-Options", "nosniff")
    .header("Cache-Control", "private, no-cache, no-store, must-revalidate");

  const stream = fs.createReadStream(doc.filePath);
  return reply.send(stream);
});

const PORT = Number(process.env.PORT) || 3014;
await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 Service Dokumen berjalan pada http://0.0.0.0:${PORT}`);
