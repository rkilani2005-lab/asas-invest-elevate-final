/**
 * image-compression.ts
 *
 * All functions use createImageBitmap() instead of new Image() to avoid
 * Vite production-build minification issues where `Image` gets renamed
 * to a short identifier (e.g. `Ns`) that then fails as a constructor.
 *
 * createImageBitmap() is a global function — it cannot be renamed by
 * minifiers — and is supported in all modern browsers and Chromium WebViews.
 */

// ── Public helpers ─────────────────────────────────────────────────────────────

/**
 * Compress a File to WebP (JPEG fallback), keeping original dimensions.
 */
export async function compressImage(file: File, quality = 0.85): Promise<Blob> {
  return compressImageToLimit(file, Infinity, undefined, quality);
}

/**
 * Compress a Blob to WebP (JPEG fallback), keeping original dimensions.
 */
export async function compressImageBlob(blob: Blob, quality = 0.85): Promise<Blob> {
  return compressImageToLimit(blob, Infinity, undefined, quality);
}

/**
 * Compress an image Blob/File to under maxBytes.
 * Tries progressively lower quality and smaller resolutions until it fits.
 */
export async function compressImageToLimit(
  source: Blob | File,
  maxBytes = 600 * 1024,
  onProgress?: (info: { quality: number; size: number; pass: string }) => void,
  startQuality = 0.85,
): Promise<Blob> {
  const resolutions = [1920, 1440, 1080];
  const minQuality  = 0.55;

  for (const maxDim of resolutions) {
    let quality = startQuality;

    const resized = await resizeBlobBitmap(source, maxDim);

    while (quality >= minQuality) {
      const compressed = await encodeBlobBitmap(resized, quality);
      onProgress?.({ quality, size: compressed.size, pass: `${maxDim}px` });
      if (maxBytes === Infinity || compressed.size <= maxBytes) return compressed;
      quality -= 0.05;
    }
  }

  // Last resort: 1080 px at minimum quality
  const lastResort = await resizeBlobBitmap(source, 1080);
  return encodeBlobBitmap(lastResort, minQuality);
}

/**
 * Resize an image blob so its longest side is ≤ maxDim pixels.
 * Uses createImageBitmap() — immune to minification constructor renaming.
 */
async function resizeBlobBitmap(source: Blob | File, maxDim: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap;

  const longest = Math.max(width, height);
  const scale   = longest > maxDim ? maxDim / longest : 1;
  const w = Math.round(width  * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); throw new Error("No 2D canvas context"); }

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvasToBlob(canvas, "image/jpeg", 0.95);
}

/**
 * Encode a blob at the given quality. Tries WebP first, falls back to JPEG.
 */
async function encodeBlobBitmap(source: Blob | File, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width  = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); throw new Error("No 2D canvas context"); }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Try WebP; fall back to JPEG if the browser returns null
  try {
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp.size > 0) return webp;
  } catch {}

  return canvasToBlob(canvas, "image/jpeg", quality);
}

/** Promisified canvas.toBlob */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`toBlob failed for ${type}`))),
      type,
      quality,
    );
  });
}

// ── Utility exports ────────────────────────────────────────────────────────────

/** Return "webp" or "jpg" based on blob MIME type */
export function getExtensionFromBlob(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : "jpg";
}

/** Human-readable file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
