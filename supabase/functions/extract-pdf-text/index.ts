/**
 * extract-pdf-text — Supabase Edge Function
 *
 * Downloads a PDF from Google Drive SERVER-SIDE and extracts text.
 * Returns ONLY the text (~20 KB) instead of proxying the full PDF (~22 MB)
 * through the browser.
 *
 * Flow: Browser → this function → Google Drive → text extraction → text response
 * The browser NEVER downloads the PDF.
 *
 * Deploy: supabase functions deploy extract-pdf-text
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Token helper (shared pattern) ───────────────────────────────────────────
async function getValidToken(
  supabase: any,
): Promise<string | null> {
  const { data: rows } = await supabase
    .from("importer_settings")
    .select("key, value")
    .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);

  const map: Record<string, string> = {};
  ((rows || []) as any[]).forEach((r: any) => {
    if (r.value) map[r.key] = r.value;
  });
  if (!map.gdrive_access_token) return null;

  const expiryMs = map.gdrive_token_expiry
    ? new Date(map.gdrive_token_expiry).getTime()
    : 0;
  if (Date.now() > expiryMs - 5 * 60 * 1000 && map.gdrive_refresh_token) {
    const GCI = Deno.env.get("GOOGLE_CLIENT_ID");
    const GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (GCI && GCS) {
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GCI,
          client_secret: GCS,
          refresh_token: map.gdrive_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (r.ok) {
        const t = await r.json();
        await (supabase.from("importer_settings") as any).upsert(
          [
            { key: "gdrive_access_token", value: t.access_token },
            {
              key: "gdrive_token_expiry",
              value: new Date(
                Date.now() + (t.expires_in || 3600) * 1000,
              ).toISOString(),
            },
          ],
          { onConflict: "key" },
        );
        return t.access_token;
      }
    }
  }
  return map.gdrive_access_token;
}

// ── Lightweight PDF text extraction ─────────────────────────────────────────
// Uses regex to extract text from PDF content streams.
// Works for InDesign/Illustrator PDFs with real text layers (not scanned).
// Falls back to empty string for image-only PDFs.

function extractTextFromPdfBuffer(buffer: Uint8Array): string {
  try {
    // Decode PDF as Latin-1 (preserves all bytes without throwing)
    const raw = new TextDecoder("latin1").decode(buffer);
    const textChunks: string[] = [];

    // Only process if the file looks like a PDF
    if (!raw.startsWith("%PDF")) {
      console.warn("[extract-pdf-text] Not a valid PDF");
      return "";
    }

    // Strategy: Extract text between BT/ET (Begin Text / End Text) operators
    // Use a non-greedy match with a size limit to prevent catastrophic backtracking
    const btEtRegex = /BT\s([\s\S]{1,50000}?)ET/g;
    let match;
    let matchCount = 0;
    const MAX_MATCHES = 5000; // safety limit

    while ((match = btEtRegex.exec(raw)) !== null && matchCount++ < MAX_MATCHES) {
      const block = match[1];

      try {
        // Extract strings in parentheses: (Hello World) Tj
        const parenRegex = /\(([^)]{0,500})\)\s*T[jJ]/g;
        let strMatch;
        while ((strMatch = parenRegex.exec(block)) !== null) {
          const decoded = strMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\(/g, "(")
            .replace(/\\\)/g, ")")
            .replace(/\\\\/g, "\\");
          // Only keep printable ASCII + common Unicode (skip binary garbage)
          const clean = decoded.replace(/[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/g, "").trim();
          if (clean.length > 0) textChunks.push(clean);
        }

        // Extract TJ arrays: [(Hello ) -200 (World)] TJ
        const tjArrayRegex = /\[((?:\([^)]{0,500}\)|<[^>]{0,200}>|[^[\]]{0,100})*)\]\s*TJ/gi;
        let tjMatch;
        while ((tjMatch = tjArrayRegex.exec(block)) !== null) {
          const arr = tjMatch[1];
          const parts = arr.match(/\(([^)]{0,500})\)/g);
          if (parts) {
            const line = parts
              .map((p) =>
                p.slice(1, -1)
                  .replace(/\\n/g, "\n")
                  .replace(/\\\(/g, "(")
                  .replace(/\\\)/g, ")")
                  .replace(/\\\\/g, "\\"),
              )
              .join("");
            const clean = line.replace(/[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/g, "").trim();
            if (clean.length > 0) textChunks.push(clean);
          }
        }
      } catch {
        // Skip this BT/ET block if regex fails (e.g., CJK binary content)
        continue;
      }
    }

    // Deduplicate consecutive identical lines and clean up
    const lines: string[] = [];
    let prev = "";
    for (const chunk of textChunks) {
      const clean = chunk.trim();
      if (clean && clean !== prev && clean.length > 1) {
        lines.push(clean);
        prev = clean;
      }
    }

    return lines.join("\n");
  } catch (err) {
    console.error("[extract-pdf-text] extractTextFromPdfBuffer crashed:", err);
    return "";
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { file_id, filename } = await req.json();
    if (!file_id) {
      return new Response(
        JSON.stringify({ error: "Missing file_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = await getValidToken(supabase);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "No Google Drive token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Download PDF from Google Drive (server-to-server — fast)
    console.log(`[extract-pdf-text] Downloading "${filename || file_id}" from Drive…`);
    const startMs = Date.now();

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text().catch(() => "unknown");
      return new Response(
        JSON.stringify({
          error: `Drive download failed (HTTP ${driveRes.status})`,
          details: errText.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buffer = new Uint8Array(await driveRes.arrayBuffer());
    const dlMs = Date.now() - startMs;
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`[extract-pdf-text] Downloaded ${sizeMB} MB in ${dlMs}ms`);

    // Extract text (server-side — no browser involved)
    const extractStart = Date.now();
    const text = extractTextFromPdfBuffer(buffer);
    const extractMs = Date.now() - extractStart;

    console.log(
      `[extract-pdf-text] Extracted ${text.length} chars in ${extractMs}ms from "${filename || file_id}"`,
    );

    // If regex extraction found too little, the PDF likely uses compressed streams
    // In that case, return what we have — the AI can still work with partial text
    const quality =
      text.length > 500 ? "good" : text.length > 50 ? "partial" : "minimal";

    return new Response(
      JSON.stringify({
        ok: true,
        text,
        chars: text.length,
        quality,
        file_size_mb: parseFloat(sizeMB),
        download_ms: dlMs,
        extract_ms: extractMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extract-pdf-text]", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
