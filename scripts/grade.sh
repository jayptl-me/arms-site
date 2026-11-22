#!/usr/bin/env bash
# Full grade of the checked-out commit: every gate in order, each with its own exit line.
#   bash scripts/grade.sh            (from a fresh clone; installs from the lockfile)
set -u
mkdir -p .grade
echo "GRADE start sha=$(git rev-parse HEAD 2>/dev/null || echo unknown) $(date -u +%FT%TZ)"
echo "GRADE tools bun=$(bun --version) node=$(node --version 2>/dev/null || echo none) arch=$(uname -m)"
fails=0
gate() { # name, command...
  local name=$1; shift
  local s; s=$(date +%s)
  "$@" > ".grade/$name.log" 2>&1; local rc=$?
  tail -n 12 ".grade/$name.log" | sed "s/^/  [$name] /"
  echo "GATE $name exit=$rc secs=$(( $(date +%s) - s ))"
  [ "$rc" -eq 0 ] || fails=$((fails + 1))
  return "$rc"
}

gate install bun install --frozen-lockfile || { echo "GRADE exit=97 (install failed: NOT RUN)"; exit 97; }
gate sibling-free bash -c '! grep -rnE "(\.\./)+UIFoundry|UIFoundry/packages" src test scripts astro.config.mjs --include=*.ts --include=*.tsx --include=*.astro --include=*.mjs'
gate lint bunx oxlint --deny-warnings
gate types bun run check
gate build bun run build
gate test bun run test
gate a11y bun run a11y
gate budget bun run budget
gate sd bun scripts/structured-data.ts
gate links bun scripts/links.ts
gate negative bash scripts/negative-controls.sh
echo "GRADE exit=$fails"
exit "$fails"
