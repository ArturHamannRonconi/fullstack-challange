#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find "$ROOT" -name ".env.example" \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" | while read -r example; do
  target="${example%.example}"
  if [ ! -f "$target" ]; then
    cp "$example" "$target"
    echo "created: ${target#"$ROOT"/}"
  else
    echo "exists:  ${target#"$ROOT"/} (skipped)"
  fi
done
