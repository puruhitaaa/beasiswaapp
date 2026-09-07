#!/usr/bin/env bash
set -euo pipefail

# Multi-Repository Subtree Split Script for CI/CD and Linux environments
# Sesuai ADR-002: Ekstraksi deterministik modular monorepo ke repositori independen

DRY_RUN=false
PUSH=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --push)
      PUSH=true
      shift
      ;;
  esac
done

echo "================================================================="
echo "  BEASISWAAPP - MULTI-REPOSITORY SUBTREE SPLIT AUTOMATION"
echo "================================================================="
echo "Dry run: $DRY_RUN | Push: $PUSH"
echo ""

declare -A SERVICES=(
  ["api-gateway"]="apps/api-gateway:release/api-gateway"
  ["service-rbac"]="apps/service-rbac:release/service-rbac"
  ["service-master"]="apps/service-master:release/service-master"
  ["service-transaksi"]="apps/service-transaksi:release/service-transaksi"
  ["service-dokumen"]="apps/service-dokumen:release/service-dokumen"
  ["web"]="apps/web:release/web"
  ["contracts"]="packages/contracts:release/contracts"
)

for name in "${!SERVICES[@]}"; do
  entry="${SERVICES[$name]}"
  path="${entry%%:*}"
  branch="${entry##*:}"

  if [ ! -d "$path" ]; then
    echo "[-] Directory '$path' not found. Skipping $name."
    continue
  fi

  echo "[*] Splitting '$name' ($path) -> Branch: '$branch'..."

  if [ "$DRY_RUN" = true ]; then
    echo "    [DRY-RUN] git subtree split -P $path -b $branch"
  else
    git branch -D "$branch" 2>/dev/null || true
    git subtree split -P "$path" -b "$branch"
    echo "    [SUCCESS] Branch '$branch' ready."

    if [ "$PUSH" = true ]; then
      remote="remote-$name"
      echo "    Pushing to $remote..."
      git push "$remote" "$branch:main" --force
    fi
  fi
done

echo ""
echo "Multi-repo subtree split completed."
