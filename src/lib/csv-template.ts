// CSV template definition for bulk property import

export const CSV_HEADERS = [
  "name_en",
  "name_ar",
  "slug",
  "tagline_en",
  "tagline_ar",
  "developer_en",
  "developer_ar",
  "location_en",
  "location_ar",
  "price_range",
  "size_range",
  "unit_types",
  "ownership_type",
  "type",
  "handover_date",
  "overview_en",
  "overview_ar",
  "highlights_en",
  "highlights_ar",
  "video_url",
  "status",
  "is_featured",
  "investment_en",
  "investment_ar",
  "enduser_text_en",
  "enduser_text_ar",
] as const;

export const CSV_SAMPLE_ROW = [
  "Palm Residence Tower",
  "برج بالم ريزيدنس",
  "palm-residence-tower",
  "Luxury Living Redefined",
  "إعادة تعريف الحياة الفاخرة",
  "Emaar Properties",
  "إعمار العقارية",
  "Dubai Marina",
  "دبي مارينا",
  "AED 1.2M - 3.5M",
  "750 - 2500 sqft",
  "Studio|1BR|2BR|3BR",
  "Freehold",
  "off-plan",
  "2027-06-30",
  "A stunning waterfront development...",
  "مشروع واجهة بحرية مذهل...",
  "Panoramic sea views|Infinity pool|Smart home|Private beach",
  "إطلالات بحرية بانورامية|مسبح لا نهائي|منزل ذكي|شاطئ خاص",
  "https://youtube.com/watch?v=example",
  "available",
  "true",
  "High ROI expected in Dubai Marina area...",
  "عائد استثماري مرتفع متوقع في منطقة دبي مارينا...",
  "Perfect for families and professionals...",
  "مثالي للعائلات والمهنيين...",
];

export const CSV_INSTRUCTIONS = `# ASAS Property Bulk Import Template
# Instructions:
# 1. Fill in each row with property data. Row 1 (after headers) is a sample — delete or replace it.
# 2. Required fields: name_en, slug, type (off-plan or ready), status (available, reserved, or sold)
# 3. unit_types: separate with pipe "|" (e.g. Studio|1BR|2BR)
# 4. highlights_en / highlights_ar: separate with pipe "|"
# 5. is_featured: true or false
# 6. handover_date: YYYY-MM-DD format
# 7. slug must be unique, lowercase, hyphens only (e.g. palm-residence-tower)
`;

export function generateCSVTemplate(): string {
  const headerLine = CSV_HEADERS.join(",");
  const sampleLine = CSV_SAMPLE_ROW.map((v) =>
    `"${String(v).replace(/"/g, '""')}"`
  ).join(",");

  return `${CSV_INSTRUCTIONS}${headerLine}\n${sampleLine}`;
}

export function downloadCSVTemplate() {
  const csv = generateCSVTemplate();
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "asas-property-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export interface ParsedProperty {
  name_en: string;
  name_ar: string;
  slug: string;
  tagline_en: string;
  tagline_ar: string;
  developer_en: string;
  developer_ar: string;
  location_en: string;
  location_ar: string;
  price_range: string;
  size_range: string;
  unit_types: string[];
  ownership_type: string;
  type: "off-plan" | "ready";
  handover_date: string;
  overview_en: string;
  overview_ar: string;
  highlights_en: string[];
  highlights_ar: string[];
  video_url: string;
  status: "available" | "reserved" | "sold";
  is_featured: boolean;
  investment_en: string;
  investment_ar: string;
  enduser_text_en: string;
  enduser_text_ar: string;
}

export interface ParseResult {
  valid: ParsedProperty[];
  errors: { row: number; message: string }[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"));

  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "No data rows found" }] };
  }

  const headers = parseCSVLine(lines[0]);
  const valid: ParsedProperty[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => !v)) continue; // skip empty rows

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Validate required fields
    if (!row.name_en) {
      errors.push({ row: i + 1, message: "Missing name_en" });
      continue;
    }
    if (!row.slug) {
      errors.push({ row: i + 1, message: "Missing slug" });
      continue;
    }
    if (!["off-plan", "ready"].includes(row.type)) {
      errors.push({ row: i + 1, message: `Invalid type "${row.type}". Must be "off-plan" or "ready"` });
      continue;
    }
    if (!["available", "reserved", "sold"].includes(row.status || "available")) {
      errors.push({ row: i + 1, message: `Invalid status "${row.status}"` });
      continue;
    }

    valid.push({
      name_en: row.name_en,
      name_ar: row.name_ar || "",
      slug: row.slug,
      tagline_en: row.tagline_en || "",
      tagline_ar: row.tagline_ar || "",
      developer_en: row.developer_en || "",
      developer_ar: row.developer_ar || "",
      location_en: row.location_en || "",
      location_ar: row.location_ar || "",
      price_range: row.price_range || "",
      size_range: row.size_range || "",
      unit_types: row.unit_types ? row.unit_types.split("|").map((s) => s.trim()) : [],
      ownership_type: row.ownership_type || "",
      type: row.type as "off-plan" | "ready",
      handover_date: row.handover_date || "",
      overview_en: row.overview_en || "",
      overview_ar: row.overview_ar || "",
      highlights_en: row.highlights_en ? row.highlights_en.split("|").map((s) => s.trim()) : [],
      highlights_ar: row.highlights_ar ? row.highlights_ar.split("|").map((s) => s.trim()) : [],
      video_url: row.video_url || "",
      status: (row.status as "available" | "reserved" | "sold") || "available",
      is_featured: row.is_featured?.toLowerCase() === "true",
      investment_en: row.investment_en || "",
      investment_ar: row.investment_ar || "",
      enduser_text_en: row.enduser_text_en || "",
      enduser_text_ar: row.enduser_text_ar || "",
    });
  }

  return { valid, errors };
}
