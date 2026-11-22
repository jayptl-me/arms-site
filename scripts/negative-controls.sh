#!/usr/bin/env bash
# Negative controls: plant one known failure per gate in a scratch copy and require that gate to fail.
# Run from the repo root after `bun run build`. Never touches the real source or build.
set -u
root=$(pwd)
scratch=$(mktemp -d "${TMPDIR:-/tmp}/arms-site-nc.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
missed=0

expect_fail() { # name, command...
  local name=$1; shift
  "$@" > "$scratch/$name.log" 2>&1; local rc=$?
  if [ "$rc" -ne 0 ]; then echo "NEGATIVE $name caught=yes rc=$rc"
  else echo "NEGATIVE $name caught=no rc=0"; tail -n 20 "$scratch/$name.log"; missed=$((missed + 1)); fi
}

copy_src() { # a source copy that shares node_modules
  local dir=$scratch/$1
  mkdir -p "$dir"
  tar -C "$root" --exclude=./node_modules --exclude=./dist --exclude=./.astro -cf - . | tar -C "$dir" -xf -
  ln -s "$root/node_modules" "$dir/node_modules"
  echo "$dir"
}
copy_dist() {
  local dir=$scratch/$1
  cp -R "$root/dist" "$dir"
  echo "$dir"
}

# lint: a debugger statement (oxlint correctness rule no-debugger).
d=$(copy_src lint); printf 'export function planted() {\n  debugger;\n}\n' > "$d/src/planted.ts"
expect_fail lint bash -c "cd '$d' && bunx oxlint --deny-warnings"

# types: a string assigned to a number.
d=$(copy_src types); printf 'export const planted: number = "not a number";\n' > "$d/src/planted.ts"
expect_fail types bash -c "cd '$d' && bun --bun astro check"

# build: a page importing a module that does not exist.
d=$(copy_src build); printf -- '---\nimport Missing from "../does-not-exist.astro";\n---\n<Missing />\n' > "$d/src/pages/planted.astro"
expect_fail build bash -c "cd '$d' && bun --bun astro build"

# a11y: an image with no text alternative on the home page.
d=$(copy_dist a11y); sed -i 's#<main id="content" tabindex="-1">#&<img src="/planted.png" width="10" height="10">#' "$d/index.html"
grep -q 'planted.png' "$d/index.html" || { echo "NEGATIVE a11y plant failed"; missed=$((missed + 1)); }
expect_fail a11y bun scripts/a11y.ts --dist "$d"

# budget: 60 KB of incompressible inline script on the home page.
d=$(copy_dist budget); { printf '<script>/*'; head -c 61440 /dev/urandom | base64 -w0; printf '*/</script>'; } > "$scratch/blob"
cat "$scratch/blob" >> "$d/index.html"
expect_fail budget bun scripts/budget.ts --dist "$d"

# budget: a Google Fonts stylesheet (third party).
d=$(copy_dist thirdparty); sed -i 's#</head>#<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">&#' "$d/index.html"
expect_fail third-party bun scripts/budget.ts --dist "$d"

# a11y: an unindexed page that claims aria-current in the header nav.
d=$(copy_dist a11y-noindex); sed -i 's#<a \([^>]*href="/privacy[^>]*\)>#<a \1 aria-current="page">#' "$d/parts/index.html"
grep -q 'aria-current="page"' "$d/parts/index.html" || { echo "NEGATIVE a11y-noindex plant failed"; missed=$((missed + 1)); }
expect_fail a11y-noindex bun scripts/a11y.ts --dist "$d"

echo "NEGATIVE missed=$missed"
[ "$missed" -eq 0 ]
