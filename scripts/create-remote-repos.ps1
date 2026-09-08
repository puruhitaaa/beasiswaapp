<#
.SYNOPSIS
    Automated GitHub Repository Creator using GitHub CLI (gh).
    Creates 7 split repositories with prefix beasiswaapp- under the user's GitHub account.

.DESCRIPTION
    Creates the public repositories on GitHub:
    - beasiswaapp-contracts
    - beasiswaapp-api-gateway
    - beasiswaapp-service-rbac
    - beasiswaapp-service-master
    - beasiswaapp-service-transaksi
    - beasiswaapp-service-dokumen
    - beasiswaapp-web

.EXAMPLE
    .\scripts\create-remote-repos.ps1
#>

[CmdletBinding()]
param(
    [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"

Write-Host "Memeriksa status login gh cli..." -ForegroundColor Cyan
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "gh cli belum terautentikasi. Silakan jalankan 'gh auth login' terlebih dahulu."
    exit 1
}

$repos = @(
    @{ Name = "beasiswaapp-contracts"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - Shared TypeScript Schemas and Contracts" },
    @{ Name = "beasiswaapp-api-gateway"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - Fastify API Gateway Service" },
    @{ Name = "beasiswaapp-service-rbac"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - RBAC and Identity Provider Service" },
    @{ Name = "beasiswaapp-service-master"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - Master Data Service" },
    @{ Name = "beasiswaapp-service-transaksi"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - Transaksi and Workflow Service" },
    @{ Name = "beasiswaapp-service-dokumen"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - Dokumen and ClamAV Scanner Service" },
    @{ Name = "beasiswaapp-web"; Desc = "Aplikasi Pendaftaran Beasiswa Pelatihan - Web Frontend Application" }
)

foreach ($r in $repos) {
    $repoName = $r.Name
    $desc = $r.Desc

    Write-Host "[*] Memeriksa repositori $repoName di GitHub..." -ForegroundColor Yellow
    $exists = gh repo view $repoName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Repositori $repoName sudah ada di GitHub." -ForegroundColor Green
    } else {
        Write-Host "    Membuat repositori $repoName ($Visibility)..." -ForegroundColor Cyan
        gh repo create $repoName "--$Visibility" --description $desc
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [SUKSES] $repoName berhasil dibuat." -ForegroundColor Green
        } else {
            Write-Warning "    Gagal membuat repositori $repoName."
        }
    }
}

Write-Host ""
Write-Host "Pemeriksaan dan pembuatan repositori selesai." -ForegroundColor Cyan
