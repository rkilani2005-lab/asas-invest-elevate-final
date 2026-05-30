/**
 * Unit type formatting for property listings.
 *
 * The properties.unit_types column is a free-text array populated by the
 * importer and by manual CMS entry, so it can contain a mix of compact
 * forms ("1BR", "2BR", "3BR Chalet") and verbose forms ("1 Bedroom",
 * "3 Bedrooms", "Maisonettes"). The same property often ends up with
 * both forms of the same unit type — see /property/sensia-at-the-lagoons
 * which lists "1BR, 2BR, 3BR, Duplex, Penthouse, Maisonette, 1 Bedroom,
 * 3 Bedrooms, Maisonettes" (Maisonette and Maisonettes are the same thing).
 *
 * This module:
 *   1. Normalizes each entry to a canonical key (e.g. "1br", "maisonette").
 *   2. Dedupes so a value only renders once regardless of which form was
 *      stored.
 *   3. Translates the canonical key into a localized label in either EN
 *      or AR.
 *
 * If a value can't be matched to a known canonical type the original
 * string is shown verbatim — that way novel/unexpected entries from the
 * importer still appear; they just don't translate.
 */

type Locale = "en" | "ar";

interface UnitTypeEntry {
  /** Canonical machine key — used for dedup. */
  key: string;
  /** Display label per locale. */
  en: string;
  ar: string;
}

// Order here is also the display order: studio -> N-bed -> chalet -> duplex
// -> penthouse -> townhouse -> villa -> apartment -> maisonette -> signature.
const CANONICAL: UnitTypeEntry[] = [
  { key: "studio",       en: "Studio",                   ar: "استوديو" },
  { key: "1br",          en: "1 Bedroom",                ar: "غرفة نوم واحدة" },
  { key: "2br",          en: "2 Bedrooms",               ar: "غرفتا نوم" },
  { key: "3br",          en: "3 Bedrooms",               ar: "3 غرف نوم" },
  { key: "4br",          en: "4 Bedrooms",               ar: "4 غرف نوم" },
  { key: "5br",          en: "5 Bedrooms",               ar: "5 غرف نوم" },
  { key: "6br",          en: "6 Bedrooms",               ar: "6 غرف نوم" },
  { key: "7br",          en: "7 Bedrooms",               ar: "7 غرف نوم" },
  { key: "1br-chalet",   en: "1 Bedroom Chalet",         ar: "شاليه بغرفة نوم" },
  { key: "2br-chalet",   en: "2 Bedroom Chalet",         ar: "شاليه بغرفتي نوم" },
  { key: "3br-chalet",   en: "3 Bedroom Chalet",         ar: "شاليه بثلاث غرف نوم" },
  { key: "4br-chalet",   en: "4 Bedroom Chalet",         ar: "شاليه بأربع غرف نوم" },
  { key: "duplex",       en: "Duplex",                   ar: "دوبلكس" },
  { key: "simplex",      en: "Simplex",                  ar: "سيمبلكس" },
  { key: "penthouse",    en: "Penthouse",                ar: "بنتهاوس" },
  { key: "penthouse-simplex", en: "Penthouse Simplex",   ar: "بنتهاوس سيمبلكس" },
  { key: "penthouse-duplex",  en: "Penthouse Duplex",    ar: "بنتهاوس دوبلكس" },
  { key: "townhouse",    en: "Townhouse",                ar: "تاون هاوس" },
  { key: "villa",        en: "Villa",                    ar: "فيلا" },
  { key: "mansion",      en: "Mansion",                  ar: "قصر" },
  { key: "apartment",    en: "Apartment",                ar: "شقة" },
  { key: "loft",         en: "Loft",                     ar: "لوفت" },
  { key: "maisonette",   en: "Maisonette",               ar: "ميزونيت" },
  { key: "signature",    en: "Signature Collection",     ar: "المجموعة المميزة" },
  { key: "office",       en: "Office",                   ar: "مكتب" },
  { key: "retail",       en: "Retail",                   ar: "محل تجاري" },
  { key: "warehouse",    en: "Warehouse",                ar: "مستودع" },
  { key: "plot",         en: "Plot",                     ar: "قطعة أرض" },
];

const BY_KEY: Record<string, UnitTypeEntry> = CANONICAL.reduce(
  (acc, e) => ({ ...acc, [e.key]: e }),
  {},
);

/**
 * Map a raw string value to a canonical key (lowercased, hyphenated).
 * Returns null when no match is found — the caller should then fall back
 * to displaying the raw value.
 */
function canonicalize(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Strip plural 's' at end of a word (Maisonettes -> Maisonette,
  // 3 Bedrooms -> 3 Bedroom). Done conservatively for the last token only.
  const stripPlural = (str: string) => str.replace(/s\b/g, "");
  const sStripped = stripPlural(s);

  // 1. Bedroom forms.
  //    Match "1br", "1 br", "1bed", "1-bedroom", "one bedroom" (digits 0-9),
  //    plus optional "chalet" / "apartment" / "villa" / "townhouse" suffixes.
  const bedroomMatch = sStripped.match(
    /^(\d+)\s*-?\s*(br|bed|bedroom|b\/r)\b\s*(chalet|apartment|villa|townhouse|loft|duplex|simplex|penthouse)?$/i,
  );
  if (bedroomMatch) {
    const n = bedroomMatch[1];
    const suffix = bedroomMatch[3];
    if (suffix === "chalet") return `${n}br-chalet`;
    if (suffix === "duplex") return "duplex"; // 3BR Duplex collapses to Duplex
    if (suffix === "simplex") return "simplex";
    if (suffix === "penthouse") return "penthouse";
    return `${n}br`;
  }

  // 2. Word match against canonical labels.
  for (const entry of CANONICAL) {
    if (sStripped === entry.key) return entry.key;
    if (sStripped === stripPlural(entry.en.toLowerCase())) return entry.key;
    if (s === entry.ar) return entry.key;
  }

  // 3. Substring fallback for compound names like "Penthouse Simplex",
  //    "Signature Collection", "Penthouse Simplex and Duplex".
  if (s.includes("penthouse simplex")) return "penthouse-simplex";
  if (s.includes("penthouse duplex"))  return "penthouse-duplex";
  if (s.includes("signature"))         return "signature";
  if (s.includes("maisonette"))        return "maisonette";
  if (s.includes("penthouse"))         return "penthouse";
  if (s.includes("townhouse"))         return "townhouse";
  if (s.includes("duplex"))            return "duplex";
  if (s.includes("studio"))            return "studio";
  if (s.includes("villa"))             return "villa";
  if (s.includes("apartment"))         return "apartment";

  return null;
}

/**
 * Translate a single raw unit type string to the localized label.
 * Falls back to the original string if it can't be canonicalized.
 */
export function formatUnitType(raw: string, locale: Locale): string {
  const key = canonicalize(raw);
  if (key && BY_KEY[key]) return BY_KEY[key][locale];
  return raw;
}

/**
 * Format a unit_types array (as stored in the DB) into a localized,
 * deduplicated, comma-separated string.
 *
 *   formatUnitTypes(["1BR", "1 Bedroom", "Maisonette", "Maisonettes"], "ar")
 *   // => "غرفة نوم واحدة، ميزونيت"
 *
 * Comma style follows the locale: ", " for English, "، " (Arabic comma
 * with trailing space) for Arabic.
 */
export function formatUnitTypes(
  values: readonly string[] | null | undefined,
  locale: Locale,
): string {
  if (!values?.length) return "";

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const key = canonicalize(raw);
    // For dedup: a known canonical key wins; for unknown values, use the
    // lowercased raw string so "Foo" and "foo" still collapse.
    const dedupKey = key ?? raw.trim().toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push(key && BY_KEY[key] ? BY_KEY[key][locale] : raw);
  }

  // Preserve canonical display order when entries are known.
  const orderIndex = (label: string) => {
    const found = CANONICAL.findIndex(
      (e) => e.en === label || e.ar === label,
    );
    return found === -1 ? Number.MAX_SAFE_INTEGER : found;
  };
  out.sort((a, b) => {
    const ia = orderIndex(a);
    const ib = orderIndex(b);
    if (ia === ib) return a.localeCompare(b, locale);
    return ia - ib;
  });

  const sep = locale === "ar" ? "، " : ", ";
  return out.join(sep);
}
