#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
DEST="$CODEX_HOME/skills"

mkdir -p "$DEST"
cp -R "$ROOT/skills/course-paper-final-delivery" "$DEST/"
cp -R "$ROOT/skills/course-paper-zh" "$DEST/"
cp -R "$ROOT/skills/domestic-paper-detection" "$DEST/"

echo "Installed skills to $DEST"
