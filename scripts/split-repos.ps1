<#
.SYNOPSIS
    Automated Multi-Repository Extraction Script (PowerShell).
    Extracts modular applications and contracts into standalone remote repositories with prefix beasiswaapp-.

.DESCRIPTION
    Complies with ADR-002: Allows local development inside the modular monorepo, while enabling deterministic
    extraction and distribution into 7 independent repositories on GitHub. Handles packages/contracts and
    resolves catalog: versions so split repositories run with zero dependency errors.

.PARAMETER DryRun
    Simulate the split without pushing to remote repositories.

.PARAMETER Push
    Push the extracted services to remote repositories on GitHub.

.EXAMPLE
    .\scripts\split-repos.ps1
    .\scripts\split-repos.ps1 -Push
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Push
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  BEASISWAAPP - MULTI-REPOSITORY SPLIT & DISTRIBUTION" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Mode: $(if ($Push) { 'LIVE PUSH TO GITHUB' } else { 'LOCAL DRY-RUN' })" -ForegroundColor Yellow
Write-Host ""

$argsList = @("scripts/split-services.mjs")
if ($Push) {
    $argsList += "--push"
}

node @argsList

if ($LASTEXITCODE -ne 0) {
    Write-Error "Proses split services gagal dengan exit code $LASTEXITCODE."
}
