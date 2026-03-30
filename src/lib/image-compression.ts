/**
 * image-compression.ts
 *
 * ALL browser constructors and globals are accessed via the window object
 * (e.g. window.createImageBitmap, window.FileReader) so Vite's production
 * minifier cannot rename them to short identifiers like Ns / Cs.
 *
 * Minifiers CAN rename standalone identifiers: `createImageBitmap()`
 * Minifiers CANNOT rename property accesses: `window.createImageBitmap()`
 */

// ── Public API ─────────────────────────────────────────────────────────────────

export async function compressImage(file: File, quality = 0.85): Promise<Blob> {
  return _compressToLimit(file, Infinity, undefined, quality);
}

export async function compressImageBlob(blob: Blob, quality = 0.85): Promise<Blob> {
  return _compressToLimit(blob, Infinity, undefined, quality);
}

export async function compressImageToLimit(
  source: Blob | File,
  maxBytes = 600 * 1024,
  onProgress?: (info: { quality: number; size: number; pass: string }) => void,
  startQuality = 0.85,
): Promise<Blob> {
  return _compressToLimit(source, maxBytes, onProgress, startQuality);
}

// ── Core implementation ────────────────────────────────────────────────────────

async function _compressToLimit(
  source: Blob | File,
  maxBytes: number,
  onProgress?: (info: { quality: number; size: number; pass: string }) => void,
  startQuality = 0.85,
): Promise<Blob> {
  const resolutions = [1920, 1440, 1080];
  const minQuality  = 0.55;

  for (const maxDim of resolutions) {
    let quality = startQuality;
    const resized = await _resize(source, maxDim);

    while (quality >= minQuality) {
      const compressed = await _encode(resized, quality);
      onProgress?.({ quality, size: compressed.size, pass: `${maxDim}px` });
      if (maxBytes === Infinity || compressed.size <= maxBytes) return compressed;
      quality -= 0.05;
    }
  }

  const lastResort = await _resize(source, 1080);
  return _encode(lastResort, minQuality);
}

/** Resize blob so its longest side ≤ maxDim. Uses window.createImageBitmap. */
async function _resize(source: Blob | File, maxDim: number): Promise<Blob> {
  // Access via window to prevent Vite minifier renaming
  const bitmap = await (window as any).createImageBitmap(source);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width  * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); throw new Error("No 2D canvas context"); }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return _toBlob(canvas, "image/jpeg", 0.95);
}

/** Encode blob at given quality, WebP preferred with JPEG fallback. */
async function _encode(source: Blob | File, quality: number): Promise<Blob> {
  const bitmap = await (window as any).createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width  = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); throw new Error("No 2D canvas context"); }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  try {
    const webp = await _toBlob(canvas, "image/webp", quality);
    if (webp.size > 0) return webp;
  } catch {}

  return _toBlob(canvas, "image/jpeg", quality);
}

/** Promisified canvas.toBlob */
function _toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`toBlob failed for ${type}`))),
      type,
      quality,
    )
  );
}

// ── Utilities ──────────────────────────────────────────────────────────────────

export function getExtensionFromBlob(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : "jpg";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
