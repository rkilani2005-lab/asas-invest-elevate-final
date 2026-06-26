// Localize property unit-type tokens (e.g. "1BR", "2BR Chalet", "Penthouse
// Simplex and Duplex") to Arabic for display. Best-effort token translation —
// the data itself stays English in the DB.

const WORD_MAP_AR: Record<string, string> = {
  "signature collection": "مجموعة سيجنتشر",
  "town home": "تاون هوم",
  "town house": "تاون هاوس",
  townhomes: "تاون هوم",
  townhome: "تاون هوم",
  townhouses: "تاون هاوس",
  townhouse: "تاون هاوس",
  apartments: "شقق",
  apartment: "شقة",
  penthouse: "بنتهاوس",
  duplex: "دوبلكس",
  simplex: "سيمبلكس",
  studio: "استوديو",
  villas: "فلل",
  villa: "فيلا",
  chalet: "شاليه",
  loft: "لوفت",
  and: "و",
};

function localizeToken(token: string): string {
  let s = token.trim();
  if (!s) return s;
  // "1BR" / "2 Bed" / "3 Bedroom(s)" / "1BHK" → "N غرفة"
  s = s.replace(/(\d+)\s*(?:br|bed(?:room)?s?|bhk)\b/gi, "$1 غرفة");
  for (const [en, ar] of Object.entries(WORD_MAP_AR)) {
    s = s.replace(new RegExp(`\\b${en}\\b`, "gi"), ar);
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

export function localizeUnitTypes(types: string[] | null | undefined, lang: string): string {
  const list = (types || []).map((t) => String(t).trim()).filter(Boolean);
  if (lang !== "ar") return list.join(", ");
  return list.map(localizeToken).join("، "); // Arabic comma separator
}

// Ownership type (Freehold / Leasehold) → Arabic.
export function localizeOwnership(value: string | null | undefined, lang: string): string {
  const v = (value || "").trim();
  if (!v || lang !== "ar") return v;
  const low = v.toLowerCase();
  if (low.includes("freehold")) return "التملك الحر";
  if (low.includes("leasehold")) return "حق انتفاع";
  return v;
}

// Size range like "450 - 3,200 sqft" → Arabic unit (قدم² / م²). Render inside a
// dir="ltr" wrapper so the number range doesn't bidi-reverse in the RTL page.
export function localizeSizeRange(value: string | null | undefined, lang: string): string {
  const v = (value || "").trim();
  if (!v || lang !== "ar") return v;
  return v
    .replace(/\bsq\.?\s?ft\b/gi, "قدم²")
    .replace(/\bsqft\b/gi, "قدم²")
    .replace(/\bsq\.?\s?m\b/gi, "م²")
    .replace(/\bsqm\b/gi, "م²");
}
