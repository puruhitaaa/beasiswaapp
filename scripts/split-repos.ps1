<#
.SYNOPSIS
    Automated Multi-Repository Extraction Script (PowerShell).
    Extracts modular applications and contracts into standalone release branches via git subtree split.

.DESCRIPTION
    Complies with ADR-002: Allows local development inside the modular monorepo, while enabling deterministic
    extraction and deployment into 6 independent repositories for production delivery.

.PARAMETER DryRun
    Simulate the subtree split without creating actual git branches or executing git commands.

.PARAMETER Push
    Push the generated branches to configured remote repositories.

.EXAMPLE
    .\scripts\split-repos.ps1 -DryRun
    .\scripts\split-repos.ps1
    .\scripts\split-repos.ps1 -Push
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Push
)

$ErrorActionPreference = "Stop"

$services = @(
    @{ Name = "api-gateway"; Path = "apps/api-gateway"; Branch = "release/api-gateway" },
    @{ Name = "service-rbac"; Path = "apps/service-rbac"; Branch = "release/service-rbac" },
    @{ Name = "service-master"; Path = "apps/service-master"; Branch = "release/service-master" },
    @{ Name = "service-transaksi"; Path = "apps/service-transaksi"; Branch = "release/service-transaksi" },
    @{ Name = "service-dokumen"; Path = "apps/service-dokumen"; Branch = "release/service-dokumen" },
    @{ Name = "web"; Path = "apps/web"; Branch = "release/web" },
    @{ Name = "contracts"; Path = "packages/contracts"; Branch = "release/contracts" }
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  BEASISWAAPP - MULTI-REPOSITORY SUBTREE SPLIT AUTOMATION" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN (Simulasi)' } else { 'LIVE EXECUTION' })" -ForegroundColor Yellow
Write-Host ""

foreach ($svc in $services) {
    $name = $svc.Name
    $path = $svc.Path
    $branch = $svc.Branch

    if (-not (Test-Path $path)) {
        Write-Warning "Directory '$path' not found. Skipping $name."
        continue
    }

    Write-Host "[*] Processing '$name' ($path) -> Branch: '$branch'..." -ForegroundColor Green

    $splitCmd = "git subtree split -P $path -b $branch"
    if ($DryRun) {
        Write-Host "    [DRY-RUN] Would execute: $splitCmd" -ForegroundColor Gray
    } else {
        try {
            # Check if branch already exists and delete to ensure clean split
            $existingBranch = git branch --list $branch
            if ($existingBranch) {
                Write-Host "    Branch '$branch' already exists, resetting..." -ForegroundColor DarkGray
                git branch -D $branch | Out-Null
            }
            
            Invoke-Expression $splitCmd
            Write-Host "    [SUCCESS] Branch '$branch' successfully generated." -ForegroundColor Green
            
            if ($Push) {
                $remoteName = "remote-$name"
                Write-Host "    Pushing to remote '$remoteName'..." -ForegroundColor Yellow
                git push $remoteName "$($branch):main" --force
            }
        } catch {
            Write-Error "Failed to split ${name}: $_"
        }
    }
}

Write-Host ""
Write-Host "Multi-repo subtree split completed." -ForegroundColor Cyan
