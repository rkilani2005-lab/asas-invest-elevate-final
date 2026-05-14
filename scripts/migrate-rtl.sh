#!/usr/bin/env bash
# Migrates directional Tailwind classes to logical (RTL-aware) equivalents.
# - ml-X  -> ms-X            (margin-inline-start)
# - mr-X  -> me-X            (margin-inline-end)
# - pl-X  -> ps-X            (padding-inline-start)
# - pr-X  -> pe-X            (padding-inline-end)
# - left-X  -> start-X       (inset-inline-start)   [Tailwind values only]
# - right-X -> end-X         (inset-inline-end)     [Tailwind values only]
# - text-left  -> text-start
# - text-right -> text-end
# - border-l(-w?)  -> border-s(-w?)
# - border-r(-w?)  -> border-e(-w?)
# - rounded-l-X / rounded-r-X -> rounded-s-X / rounded-e-X
# - rounded-tl-X / rounded-tr-X / rounded-bl-X / rounded-br-X -> rounded-ss/se/es/ee-X
#
# Does NOT touch:
# - components/ui/** (shadcn primitives — vendored)
# - .test., .spec., .stories. files
# - space-x-* (handled via CSS overrides; gap migration is risky)
# - flex-row-reverse, translate-x-* (intentional)

set -euo pipefail

cd "$(dirname "$0")/../src"

# Find target files: tsx, ts, jsx, js — but exclude shadcn UI primitives and tests
mapfile -t files < <(find . -type f \( -name '*.tsx' -o -name '*.ts' \) \
  -not -path './components/ui/*' \
  -not -name '*.test.*' -not -name '*.spec.*' -not -name '*.stories.*')

echo "Files to scan: ${#files[@]}"

# All Tailwind spacing scale values we may encounter
VALUES='0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px'
# Position values (for left-/right-)  — '/' escaped because perl uses '/' as delim
POS_VALUES="${VALUES}|full|1\\/2|1\\/3|2\\/3|1\\/4|3\\/4|1\\/5|2\\/5|3\\/5|4\\/5"
# Rounded values
ROUND_VALUES='none|sm|md|lg|xl|2xl|3xl|full'

changed=0
for f in "${files[@]}"; do
  before=$(md5sum "$f" | cut -d' ' -f1)

  # margin: ml- -> ms-, mr- -> me-  (word boundary; only Tailwind values)
  perl -i -pe "s/\\b(-?)ml-(${VALUES})\\b/\${1}ms-\${2}/g; s/\\b(-?)mr-(${VALUES})\\b/\${1}me-\${2}/g" "$f"
  # padding
  perl -i -pe "s/\\bpl-(${VALUES})\\b/ps-\${1}/g; s/\\bpr-(${VALUES})\\b/pe-\${1}/g" "$f"
  # inset (left-X, right-X)  — only Tailwind position values, plus '1/2', 'full' etc.
  perl -i -pe "s/\\b(-?)left-(${POS_VALUES})\\b/\${1}start-\${2}/g; s/\\b(-?)right-(${POS_VALUES})\\b/\${1}end-\${2}/g" "$f"
  # text alignment
  perl -i -pe 's/\btext-left\b/text-start/g; s/\btext-right\b/text-end/g' "$f"
  # borders
  perl -i -pe 's/\bborder-l\b/border-s/g; s/\bborder-r\b/border-e/g' "$f"
  perl -i -pe 's/\bborder-l-(2|4|8)\b/border-s-$1/g; s/\bborder-r-(2|4|8)\b/border-e-$1/g' "$f"
  # rounded corners
  perl -i -pe "s/\\brounded-l-(${ROUND_VALUES})\\b/rounded-s-\${1}/g; s/\\brounded-r-(${ROUND_VALUES})\\b/rounded-e-\${1}/g" "$f"
  perl -i -pe "s/\\brounded-tl-(${ROUND_VALUES})\\b/rounded-ss-\${1}/g; s/\\brounded-tr-(${ROUND_VALUES})\\b/rounded-se-\${1}/g; s/\\brounded-bl-(${ROUND_VALUES})\\b/rounded-es-\${1}/g; s/\\brounded-br-(${ROUND_VALUES})\\b/rounded-ee-\${1}/g" "$f"
  # bare rounded-l / rounded-r (no value suffix)
  perl -i -pe 's/\brounded-l\b/rounded-s/g; s/\brounded-r\b/rounded-e/g' "$f"
  perl -i -pe 's/\brounded-tl\b/rounded-ss/g; s/\brounded-tr\b/rounded-se/g; s/\brounded-bl\b/rounded-es/g; s/\brounded-br\b/rounded-ee/g' "$f"

  after=$(md5sum "$f" | cut -d' ' -f1)
  if [ "$before" != "$after" ]; then
    changed=$((changed+1))
    echo "  modified: $f"
  fi
done

echo ""
echo "Total files modified: $changed"
