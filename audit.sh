#!/usr/bin/env bash
# audit.sh — DonAtento audit runner (Claude Code integration)
#
# Wraps `claude --print` against the project's CLAUDE.md rubric to
# produce a severity-scored audit of a code path. Three modes:
#
#   ./audit.sh                  print usage (this help)
#   ./audit.sh all              audit backend/src — output to stdout
#   ./audit.sh <path>           audit a specific file or directory
#   ./audit.sh report           audit backend/src + append a dated entry
#                               to AUDIT_REPORT.md with a 100-point score
#
# Score: 100 − 20·CRÍTICOs − 5·ALTOs, floored at 0.
# Rubric: CLAUDE.md → "Estándares de Auditoría — DonAtento".
#         Loaded automatically by `claude --print` from the repo root.
#
# Requirements: claude CLI in $PATH, CLAUDE.md at the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_FILE="$SCRIPT_DIR/AUDIT_REPORT.md"
CLAUDE_MD="$SCRIPT_DIR/CLAUDE.md"
DEFAULT_TARGET="backend/src"

usage() {
  cat <<EOF
audit.sh — DonAtento code auditor (Claude Code integration)

Usage:
  ./audit.sh                 print this help
  ./audit.sh all             audit ${DEFAULT_TARGET}, print findings to stdout
  ./audit.sh <path>          audit a specific file or directory
  ./audit.sh report          audit ${DEFAULT_TARGET} + append a dated entry
                             to AUDIT_REPORT.md

Score formula:
  score = max(0, 100 − 20·n_CRÍTICO − 5·n_ALTO)

Severity rubric: CLAUDE.md → "Estándares de Auditoría — DonAtento".
Loaded automatically by \`claude --print\` from the repo root.

Requirements:
  - claude CLI on PATH (https://docs.claude.com/claude-code)
  - CLAUDE.md present at repo root
EOF
}

require_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "❌ claude CLI not found in PATH." >&2
    echo "   Install: https://docs.claude.com/claude-code" >&2
    exit 1
  fi
  if [[ ! -f "$CLAUDE_MD" ]]; then
    echo "❌ CLAUDE.md not found at $CLAUDE_MD" >&2
    echo "   Without it the rubric won't be applied consistently." >&2
    exit 1
  fi
}

audit_target() {
  # @<path> is the Claude Code file-reference syntax — it inlines the
  # referenced files into the prompt context. CLAUDE.md is loaded
  # automatically from the project root.
  claude --print "audita @${1} formato CLAUDE.md"
}

# Counts **[CRÍTICO] and **[ALTO] occurrences in Claude's output and
# returns "score n_critical n_alto" on a single line.
compute_score() {
  local output="$1"
  local n_critical n_alto score
  n_critical=$(printf '%s' "$output" | grep -coE '\*\*\[CRÍTICO\]' || true)
  n_alto=$(printf     '%s' "$output" | grep -coE '\*\*\[ALTO\]'     || true)
  score=$((100 - n_critical * 20 - n_alto * 5))
  (( score < 0 )) && score=0
  echo "$score $n_critical $n_alto"
}

append_report() {
  local target="$1" output="$2" score="$3" n_critical="$4" n_alto="$5"
  {
    echo ""
    echo "---"
    echo ""
    echo "## Audit run — $(date -u +"%Y-%m-%d %H:%M UTC")"
    echo ""
    echo "Target: \`${target}\`"
    echo ""
    echo "**Score: ${score} / 100**  (CRÍTICO: ${n_critical} · ALTO: ${n_alto})"
    echo ""
    echo "<details>"
    echo "<summary>Findings (Claude output)</summary>"
    echo ""
    echo '```'
    printf '%s\n' "$output"
    echo '```'
    echo ""
    echo "</details>"
  } >> "$AUDIT_FILE"
}

mode="${1:-}"

case "$mode" in
  ""|-h|--help)
    usage
    ;;

  all)
    require_claude
    audit_target "$DEFAULT_TARGET"
    ;;

  report)
    require_claude
    output=$(audit_target "$DEFAULT_TARGET")
    read -r score n_critical n_alto <<< "$(compute_score "$output")"
    append_report "$DEFAULT_TARGET" "$output" "$score" "$n_critical" "$n_alto"
    echo "✓ Appended to $AUDIT_FILE"
    echo "  score=${score} / 100   CRÍTICO=${n_critical}   ALTO=${n_alto}"
    ;;

  *)
    # Treat anything else as a path to audit. Validate it exists so a
    # typo doesn't waste a Claude round-trip.
    if [[ ! -e "$mode" ]]; then
      echo "❌ Path not found: $mode" >&2
      echo "" >&2
      usage >&2
      exit 1
    fi
    require_claude
    audit_target "$mode"
    ;;
esac
