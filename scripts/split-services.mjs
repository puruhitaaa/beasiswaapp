import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const GITHUB_OWNER = process.env.GITHUB_OWNER || "puruhitaaa";
const SPLIT_TOKEN = process.env.SPLIT_TOKEN || process.env.GITHUB_TOKEN;

// Catalog versions mapped from pnpm-workspace.yaml
const CATALOG = {
  dotenv: "^17.4.2",
  zod: "^4.4.3",
  typescript: "^6.0.3",
  "@types/node": "^26.2.0",
  "better-auth": "1.7.1",
  "lucide-react": "^1.27.0",
  "next-themes": "^0.4.6",
  react: "^19.2.8",
  "react-dom": "^19.2.8",
  sonner: "^2.0.7",
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3",
  bootstrap: "^5.3.3",
  "@types/bootstrap": "^5.2.10",
};

const SERVICES = [
  {
    name: "contracts",
    repoName: "beasiswaapp-contracts",
    sourceDir: "packages/contracts",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - Shared TypeScript Schemas and Contracts",
    type: "package",
  },
  {
    name: "api-gateway",
    repoName: "beasiswaapp-api-gateway",
    sourceDir: "apps/api-gateway",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - Fastify API Gateway Service",
    type: "service",
    port: 3000,
    hasPrisma: false,
    needsContracts: false,
  },
  {
    name: "service-rbac",
    repoName: "beasiswaapp-service-rbac",
    sourceDir: "apps/service-rbac",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - RBAC and Identity Provider Service",
    type: "service",
    port: 3001,
    hasPrisma: true,
    needsContracts: true,
  },
  {
    name: "service-master",
    repoName: "beasiswaapp-service-master",
    sourceDir: "apps/service-master",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - Master Data Service",
    type: "service",
    port: 3002,
    hasPrisma: true,
    needsContracts: true,
  },
  {
    name: "service-transaksi",
    repoName: "beasiswaapp-service-transaksi",
    sourceDir: "apps/service-transaksi",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - Transaksi and Workflow Service",
    type: "service",
    port: 3003,
    hasPrisma: true,
    needsContracts: true,
  },
  {
    name: "service-dokumen",
    repoName: "beasiswaapp-service-dokumen",
    sourceDir: "apps/service-dokumen",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - Dokumen and ClamAV Scanner Service",
    type: "service",
    port: 3004,
    hasPrisma: true,
    needsContracts: true,
  },
  {
    name: "web",
    repoName: "beasiswaapp-web",
    sourceDir: "apps/web",
    description: "Aplikasi Pendaftaran Beasiswa Pelatihan - Web Frontend Application",
    type: "frontend",
    port: 3001,
    hasPrisma: false,
    needsContracts: true,
    needsEnvAndUi: true,
  },
];

function transformPackageJson(pkgPath, options = {}) {
  if (!fs.existsSync(pkgPath)) return;
  const raw = fs.readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(raw);

  const resolveDeps = (deps) => {
    if (!deps) return;
    for (const [key, val] of Object.entries(deps)) {
      if (val === "catalog:") {
        deps[key] = CATALOG[key] || "^1.0.0";
      }
      if (key === "@beasiswaapp/config") {
        delete deps[key];
      }
      if (key === "@beasiswaapp/contracts" && options.localContracts) {
        deps[key] = "file:./packages/contracts";
      }
      if (key === "@beasiswaapp/env" && options.localEnv) {
        deps[key] = "file:./packages/env";
      }
      if (key === "@beasiswaapp/ui" && options.localUi) {
        deps[key] = "file:./packages/ui";
      }
    }
  };

  resolveDeps(pkg.dependencies);
  resolveDeps(pkg.devDependencies);
  resolveDeps(pkg.peerDependencies);

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function copyDirectory(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(dest, { recursive: true });

  const ignoreList = new Set([
    "node_modules",
    "dist",
    ".tanstack",
    ".turbo",
    ".next",
    ".git",
  ]);

  for (const item of fs.readdirSync(src)) {
    if (ignoreList.has(item)) continue;
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generateStandaloneDockerfile(targetDir, service) {
  if (service.type === "package") return;

  let dockerfileContent = "";
  if (service.type === "frontend") {
    dockerfileContent = `FROM node:24-slim AS builder
RUN npm install -g pnpm@10.33.2
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
  } else if (service.hasPrisma) {
    dockerfileContent = `FROM node:24-slim AS builder
RUN npm install -g pnpm@10.33.2
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run db:generate
RUN pnpm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE ${service.port}
CMD ["node", "dist/index.mjs"]
`;
  } else {
    dockerfileContent = `FROM node:24-slim AS builder
RUN npm install -g pnpm@10.33.2
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE ${service.port}
CMD ["node", "dist/index.mjs"]
`;
  }

  fs.writeFileSync(path.join(targetDir, "Dockerfile"), dockerfileContent);
}

function generateStandaloneReadme(targetDir, service) {
  const readmeContent = `# ${service.repoName}

${service.description}

Repositori ini merupakan komponen mandiri yang diekstrak secara otomatis dari monorepo utama beasiswaapp.

## Menjalankan secara Lokal

1. Pasang dependensi:
   \`\`\`bash
   pnpm install
   \`\`\`

2. ${service.hasPrisma ? "Jalankan migrasi database dan seed:\n   ```bash\n   pnpm run db:generate\n   pnpm run db:push\n   ```\n\n3. " : ""}Jalankan server pengembangan:
   \`\`\`bash
   pnpm run dev
   \`\`\`

${service.port ? `## Port Layanan\n\nLayanan ini berjalan pada port \`${service.port}\`.\n` : ""}
`;
  fs.writeFileSync(path.join(targetDir, "README.md"), readmeContent);
}

export async function splitAllServices(options = {}) {
  const shouldPush = options.push ?? process.argv.includes("--push");
  const tempBase = path.join(ROOT_DIR, ".split_temp");

  if (fs.existsSync(tempBase)) {
    fs.rmSync(tempBase, { recursive: true, force: true });
  }
  fs.mkdirSync(tempBase, { recursive: true });

  console.log("===============================================================");
  console.log("  BEASISWAAPP - MULTI-REPOSITORY SPLIT AND DISTRIBUTION");
  console.log("===============================================================");
  console.log(`Target GitHub Owner: ${GITHUB_OWNER}`);
  console.log(`Mode Push: ${shouldPush ? "AKTIF" : "DRY-RUN / LOKAL"}`);
  console.log("");

  for (const service of SERVICES) {
    console.log(`[*] Memproses ${service.name} -> ${service.repoName}...`);
    const serviceTargetDir = path.join(tempBase, service.repoName);
    const serviceSourceDir = path.join(ROOT_DIR, service.sourceDir);

    // 1. Copy source files
    copyDirectory(serviceSourceDir, serviceTargetDir);

    // 2. Handle contracts dependency
    if (service.needsContracts) {
      const targetContractsDir = path.join(serviceTargetDir, "packages", "contracts");
      copyDirectory(path.join(ROOT_DIR, "packages", "contracts"), targetContractsDir);
      transformPackageJson(path.join(targetContractsDir, "package.json"), { localContracts: false });
    }

    // 3. Handle env and UI dependencies for web
    if (service.needsEnvAndUi) {
      const targetEnvDir = path.join(serviceTargetDir, "packages", "env");
      copyDirectory(path.join(ROOT_DIR, "packages", "env"), targetEnvDir);
      transformPackageJson(path.join(targetEnvDir, "package.json"), {});

      const targetUiDir = path.join(serviceTargetDir, "packages", "ui");
      copyDirectory(path.join(ROOT_DIR, "packages", "ui"), targetUiDir);
      transformPackageJson(path.join(targetUiDir, "package.json"), {});
    }

    // 4. Add mini pnpm-workspace if packages directory exists
    if (fs.existsSync(path.join(serviceTargetDir, "packages"))) {
      const workspaceYaml = "packages:\n  - .\n  - packages/*\n";
      fs.writeFileSync(path.join(serviceTargetDir, "pnpm-workspace.yaml"), workspaceYaml);
    }

    // 5. Transform root package.json
    transformPackageJson(path.join(serviceTargetDir, "package.json"), {
      localContracts: service.needsContracts,
      localEnv: service.needsEnvAndUi,
      localUi: service.needsEnvAndUi,
    });

    // 6. Generate standalone Dockerfile and README
    generateStandaloneDockerfile(serviceTargetDir, service);
    generateStandaloneReadme(serviceTargetDir, service);

    // 7. Git initialize and push
    if (shouldPush) {
      const remoteUrl = SPLIT_TOKEN
        ? `https://x-access-token:${SPLIT_TOKEN}@github.com/${GITHUB_OWNER}/${service.repoName}.git`
        : `git@github.com:${GITHUB_OWNER}/${service.repoName}.git`;

      console.log(`    Mengirim pembaruan ke ${service.repoName}...`);
      try {
        execSync("git init -b main", { cwd: serviceTargetDir, stdio: "pipe" });
        execSync("git config user.name \"GitHub Actions\"", { cwd: serviceTargetDir, stdio: "pipe" });
        execSync("git config user.email \"actions@github.com\"", { cwd: serviceTargetDir, stdio: "pipe" });
        execSync("git add .", { cwd: serviceTargetDir, stdio: "pipe" });
        execSync("git commit -m \"chore: distribution release sync from monorepo\"", { cwd: serviceTargetDir, stdio: "pipe" });
        execSync(`git remote add origin ${remoteUrl}`, { cwd: serviceTargetDir, stdio: "pipe" });
        execSync("git push -u origin main --force", { cwd: serviceTargetDir, stdio: "pipe" });
        console.log(`    [SUKSES] ${service.repoName} berhasil di-push.`);
      } catch (err) {
        console.error(`    [GAGAL] Gagal mengirim ${service.repoName}:`, err.message);
      }
    } else {
      console.log(`    [SIAP] Berkas siap di direktori sementara: ${serviceTargetDir}`);
    }
  }

  console.log("");
  console.log("Distribusi split repositori selesai.");
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("split-services.mjs")) {
  splitAllServices().catch((err) => {
    console.error("Error saat split services:", err);
    process.exit(1);
  });
}
