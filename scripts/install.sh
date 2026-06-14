#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
CODEX_DEST="${CODEX_SKILLS_DIR:-$CODEX_HOME/skills}"
CLAUDE_DEST="${CLAUDE_CODE_SKILLS_DIR:-$CLAUDE_HOME/skills}"
TARGET="${1:-all}"

SKILLS=(
  "course-paper-final-delivery"
  "course-paper-zh"
  "domestic-paper-detection"
)

install_to() {
  local dest="$1"
  mkdir -p "$dest"
  for skill in "${SKILLS[@]}"; do
    rm -rf "$dest/$skill"
    cp -R "$ROOT/skills/$skill" "$dest/"
  done
  echo "Installed skills to $dest"
}

case "$TARGET" in
  all)
    install_to "$CODEX_DEST"
    install_to "$CLAUDE_DEST"
    ;;
  codex)
    install_to "$CODEX_DEST"
    ;;
  claude|claude-code)
    install_to "$CLAUDE_DEST"
    ;;
  *)
    echo "Usage: $0 [all|codex|claude]" >&2
    echo "Environment overrides: CODEX_HOME, CODEX_SKILLS_DIR, CLAUDE_HOME, CLAUDE_CODE_SKILLS_DIR" >&2
    exit 2
    ;;
esac
