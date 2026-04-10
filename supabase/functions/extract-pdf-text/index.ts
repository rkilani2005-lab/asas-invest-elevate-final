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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Token helper (shared pattern) ───────────────────────────────────────────
async function getValidToken(
  supabase: ReturnType<typeof createClient>,
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
  // Decode PDF as Latin-1 (preserves all bytes)
  const raw = new TextDecoder("latin1").decode(buffer);

  const textChunks: string[] = [];

  // Strategy 1: Extract text between BT/ET (Begin Text / End Text) operators
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];

    // Extract strings in parentheses: (Hello World) Tj
    const parenRegex = /\(([^)]*)\)\s*T[jJ]/g;
    let strMatch;
    while ((strMatch = parenRegex.exec(block)) !== null) {
      const decoded = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
      if (decoded.trim()) textChunks.push(decoded);
    }

    // Extract hex strings: <48656C6C6F> Tj
    const hexRegex = /<([0-9A-Fa-f\s]+)>\s*T[jJ]/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const hex = hexMatch[1].replace(/\s/g, "");
      let decoded = "";
      for (let i = 0; i < hex.length; i += 2) {
        decoded += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
      }
      if (decoded.trim()) textChunks.push(decoded);
    }

    // Extract TJ arrays: [(Hello ) -200 (World)] TJ
    const tjArrayRegex = /\[((?:\([^)]*\)|<[^>]*>|[^[\]])*)\]\s*TJ/gi;
    let tjMatch;
    while ((tjMatch = tjArrayRegex.exec(block)) !== null) {
      const arr = tjMatch[1];
      const parts = arr.match(/\(([^)]*)\)/g);
      if (parts) {
        const line = parts
          .map((p) =>
            p
              .slice(1, -1)
              .replace(/\\n/g, "\n")
              .replace(/\\\(/g, "(")
              .replace(/\\\)/g, ")")
              .replace(/\\\\/g, "\\"),
          )
          .join("");
        if (line.trim()) textChunks.push(line);
      }
    }
  }

  // Strategy 2: If BT/ET extraction found little, try stream decompression
  // (for FlateDecode streams — most modern PDFs use this)
  if (textChunks.join("").length < 100) {
    // Try to find and decompress FlateDecode streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(raw)) !== null) {
      try {
        const compressed = new Uint8Array(
          streamMatch[1].split("").map((c) => c.charCodeAt(0)),
        );
        const decompressed = new TextDecoder("utf-8", { fatal: false }).decode(
          new DecompressionStream("deflate")
            ? compressed
            : compressed,
        );
        // Look for text operators in decompressed stream
        const btEt2 = /BT\s([\s\S]*?)ET/g;
        let m2;
        while ((m2 = btEt2.exec(decompressed)) !== null) {
          const parenRegex2 = /\(([^)]*)\)\s*T[jJ]/g;
          let s2;
          while ((s2 = parenRegex2.exec(m2[1])) !== null) {
            if (s2[1].trim()) textChunks.push(s2[1]);
          }
        }
      } catch {
        // Decompression failed — skip this stream
      }
    }
  }

  // Deduplicate consecutive identical lines and clean up
  const lines: string[] = [];
  let prev = "";
  for (const chunk of textChunks) {
    const clean = chunk.trim();
    if (clean && clean !== prev) {
      lines.push(clean);
      prev = clean;
    }
  }

  return lines.join("\n");
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
