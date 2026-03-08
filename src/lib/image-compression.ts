/**
 * Compresses an image file using Canvas API
 * Converts to WebP format for better compression (with JPEG fallback)
 * Maintains original resolution while reducing file size
 */
export async function compressImage(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Try WebP first (best compression), fallback to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if WebP fails
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve(jpegBlob);
                } else {
                  reject(new Error("Failed to compress image"));
                }
              },
              "image/jpeg",
              quality
            );
          }
        },
        "image/webp",
        quality
      );
      
      // Clean up object URL
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compresses an image blob (not just File) using Canvas API.
 * Accepts a Blob/ArrayBuffer fetched from a URL.
 */
export async function compressImageBlob(
  blob: Blob,
  quality = 0.85
): Promise<Blob> {
  const file = new File([blob], "image", { type: blob.type || "image/jpeg" });
  return compressImage(file, quality);
}

/**
 * Compress an image loaded from a URL to a target max size in bytes.
 * Steps:
 *   1. Resize to max 1920px on longest side
 *   2. Encode at starting quality (default 0.85), step down by 0.05 until under limit
 *   3. If still too large at quality 0.55, resize to 1440px and retry
 *   4. If still too large, resize to 1080px and retry
 * Returns the compressed Blob.
 */
export async function compressImageToLimit(
  sourceBlob: Blob,
  maxBytes = 600 * 1024,
  onProgress?: (info: { quality: number; size: number; pass: string }) => void
): Promise<Blob> {
  const resolutions = [1920, 1440, 1080];
  const minQuality = 0.55;

  for (const maxDim of resolutions) {
    let quality = 0.85;

    // Load into an img element to get natural dimensions
    const resized = await resizeBlob(sourceBlob, maxDim);

    while (quality >= minQuality) {
      const compressed = await encodeBlob(resized, quality);
      onProgress?.({ quality, size: compressed.size, pass: `${maxDim}px` });

      if (compressed.size <= maxBytes) return compressed;
      quality -= 0.05;
    }

    // At minimum quality this resolution is still too large — try smaller resolution
  }

  // Last-resort: return minimum quality at 1080px even if still over limit
  const lastResort = await resizeBlob(sourceBlob, 1080);
  return encodeBlob(lastResort, minQuality);
}

/** Resize a blob so its longest side is at most `maxDim` px */
async function resizeBlob(blob: Blob, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const longest = Math.max(width, height);
      const scale = longest > maxDim ? maxDim / longest : 1;
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Resize failed"))),
        "image/jpeg",
        0.95 // high quality intermediate for the resize step
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

/** Encode a blob at the given quality, preferring WebP with JPEG fallback */
async function encodeBlob(blob: Blob, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (webp) => {
          if (webp) return resolve(webp);
          // WebP not supported — fall back to JPEG
          canvas.toBlob(
            (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error("Encode failed"))),
            "image/jpeg",
            quality
          );
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

/**
 * Get the file extension based on blob type
 */
export function getExtensionFromBlob(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : "jpg";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
