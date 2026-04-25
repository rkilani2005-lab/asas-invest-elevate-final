/**
 * Converts a Supabase Storage public URL into a transformed/resized URL.
 * Only works for URLs hosted on the project's Supabase storage.
 * Non-Supabase URLs are returned unchanged.
 *
 * @param url     Original public URL
 * @param width   Desired width (1-2500)
 * @param quality Image quality (1-100, default 75)
 */
export function getStorageThumbnailUrl(
  url: string,
  width: number,
  quality = 85,
  resize: "cover" | "contain" | "fill" = "cover"
): string {
  // Only transform Supabase storage URLs
  if (!url.includes("supabase") || !url.includes("/storage/v1/object/public/")) {
    return url;
  }

  return url
    .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
    + `?width=${width}&quality=${quality}&resize=${resize}`;
}
