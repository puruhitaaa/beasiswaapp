# Panduan Pola Multi-Repository (Multi-Repo Workflow Guide)

**Dokumen Referensi:** [`docs/keputusan-arsitektur-dan-rekomendasi-teknis.md`](file:///D:/coding/beasiswaapp/docs/keputusan-arsitektur-dan-rekomendasi-teknis.md) (ADR-002)

---

## 1. Filosofi & Alur Kerja (Development vs Production Delivery)

Arsitektur sistem ini menerapkan prinsip rekonsiliasi yang memadukan kecepatan pengembangan lokal (*Fast Iteration*) dengan kepatuhan pemisahan repositori per-layanan (*Production Multi-Repo Isolation*):

1. **Fase Pengembangan Lokal (Saat Ini):**
   - Basis kode dikembangkan dalam satu *Isolated Modular Monorepo* menggunakan pnpm workspace.
   - Setiap servis (`apps/api-gateway`, `apps/service-rbac`, `apps/service-master`, `apps/service-transaksi`, `apps/service-dokumen`, `apps/web`) bersifat mandiri:
     - Memiliki `package.json`, `tsconfig.json`, `Dockerfile`, dan skema database `prisma/schema.prisma` tersendiri.
     - **Larangan Impor Silang:** Dilarang keras mengimpor berkas langsung dari direktori servis lain (`apps/service-a` tidak boleh mengimpor dari `apps/service-b`).
     - **Pola Komunikasi Terstandarisasi:** Seluruh komunikasi dari klien web eksternal wajib melalui API Gateway (Edge Gateway). Komunikasi antar-layanan (inter-service) dilakukan secara privat via HTTP REST internal menggunakan autentikasi header `X-Internal-Secret` di dalam Private Docker Network / Service Mesh tanpa memutar balik ke API Gateway.
     - Kontrak data dan enum bersama didefinisikan secara bersih pada `packages/contracts`.

2. **Fase Rilis & Delivery Produksi (Multi-Repo Extraction):**
   - Menggunakan utilitas git subtree bawaan, setiap servis dapat diekstrak menjadi repositori mandiri secara otomatis:
     - `apps/api-gateway` -> `repo-api-gateway`
     - `apps/service-rbac` -> `repo-service-rbac`
     - `apps/service-master` -> `repo-service-master`
     - `apps/service-transaksi` -> `repo-service-transaksi`
     - `apps/service-dokumen` -> `repo-service-dokumen`
     - `apps/web` -> `repo-frontend`
     - `packages/contracts` -> `repo-contracts`

---

## 2. Perintah Ekstraksi Multi-Repo

### A. Di Lingkungan Windows (PowerShell)
```powershell
# Menjalankan simulasi (Dry-Run)
powershell -File scripts/split-repos.ps1 -DryRun

# Menjalankan split branch secara lokal
powershell -File scripts/split-repos.ps1

# Menjalankan split dan langsung push ke remote repository masing-masing
powershell -File scripts/split-repos.ps1 -Push
```

### B. Di Lingkungan Linux / macOS / CI Runner
```bash
chmod +x scripts/split-repos.sh

# Menjalankan simulasi
./scripts/split-repos.sh --dry-run

# Menjalankan split
./scripts/split-repos.sh

# Menjalankan split dan push
./scripts/split-repos.sh --push
```

### C. Melalui Perintah npm/pnpm
```bash
pnpm run split:repos
```

---

## 3. Konfigurasi Remote Eksternal untuk Masing-Masing Servis

Sebelum menjalankan perintah dengan opsi `-Push` / `--push`, daftarkan remote Git target untuk setiap servis:

```bash
git remote add remote-api-gateway git@github.com:organization/repo-api-gateway.git
git remote add remote-service-rbac git@github.com:organization/repo-service-rbac.git
git remote add remote-service-master git@github.com:organization/repo-service-master.git
git remote add remote-service-transaksi git@github.com:organization/repo-service-transaksi.git
git remote add remote-service-dokumen git@github.com:organization/repo-service-dokumen.git
git remote add remote-web git@github.com:organization/repo-frontend.git
git remote add remote-contracts git@github.com:organization/repo-contracts.git
```

Setelah didaftarkan, skrip akan secara otomatis memisahkan histori komit relevan dan melakukan *force push* ke cabang `main` pada repositori masing-masing.
