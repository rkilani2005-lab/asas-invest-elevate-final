#!/usr/bin/env bash
# Replaces the broken RTL alignment pattern across all source files.
#
# Root cause: Tailwind's text-end is a LOGICAL property meaning "the end of
# reading direction" — left in RTL, right in LTR. The codebase uses
#     isRTL && "text-end"
# thinking "end = right in Arabic" but it actually left-aligns Arabic text.
#
# The correct logical class is text-start ("start of reading direction" =
# right in RTL, left in LTR), which auto-flips and needs no conditional.
#
# Transformations applied:
#   - isRTL && "text-end"                          -> "text-start"
#   - isRTL ? "text-end" : "text-start"            -> "text-start"
#   - typo: font-arabicic                           -> font-arabic

set -euo pipefail
cd "$(dirname "$0")/.."

mapfile -t files < <(grep -rl --include='*.tsx' --include='*.ts' \
  -E 'isRTL && "text-end"|isRTL \? "text-end" : "text-start"|font-arabicic' src/)

echo "Files to patch: ${#files[@]}"
for f in "${files[@]}"; do
  before=$(md5sum "$f" | cut -d' ' -f1)

  # 1. Plain ternary form.
  perl -i -pe 's/\bisRTL\s*\?\s*"text-end"\s*:\s*"text-start"/"text-start"/g' "$f"

  # 2. Short-circuit form. Two cases — inside a cn() argument list (",isRTL && ..." or
  #    "..., isRTL && ...") and standalone. Strip the bool guard and keep the class,
  #    preserving leading whitespace/commas.
  perl -i -pe 's/\bisRTL\s*&&\s*"text-end"/"text-start"/g' "$f"

  # 3. Typo.
  perl -i -pe 's/\bfont-arabicic\b/font-arabic/g' "$f"

  after=$(md5sum "$f" | cut -d' ' -f1)
  if [ "$before" != "$after" ]; then echo "  modified: $f"; fi
done

echo ""
echo "Sanity: residual bad patterns ->"
grep -rnE 'isRTL && "text-end"|isRTL \? "text-end" : "text-start"|font-arabicic' src/ --include='*.tsx' --include='*.ts' || echo "  (none)"
