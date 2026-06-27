// Spotlight (project-video) types + video normalization helpers.
// The `spotlights` table isn't in the generated Supabase types until the
// migration is applied, so we define the row shape here.

export type SpotlightProvider = "youtube" | "instagram" | "mp4";

export interface Spotlight {
  id: string;
  title_en: string;
  title_ar: string;
  hook_en: string | null;
  hook_ar: string | null;
  video_url: string;
  video_provider: SpotlightProvider;
  thumbnail_url: string | null;
  property_id: string | null;
  community_en: string | null;
  community_ar: string | null;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Extract a YouTube video id from any common URL form. */
export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/** A privacy-friendly, embeddable URL for click-to-play iframes. Null for mp4/IG. */
export function getEmbedUrl(s: Pick<Spotlight, "video_url" | "video_provider">): string | null {
  if (s.video_provider === "youtube") {
    const id = getYouTubeId(s.video_url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (s.video_provider === "instagram") {
    // Instagram embeds are unreliable; we open the reel in a new tab instead
    // (handled by the card). Return null so the card uses the poster-link path.
    return null;
  }
  return null; // mp4 → native <video>, handled by the card
}

/** Poster image: custom thumbnail if set, else derive for YouTube. */
export function getPosterUrl(s: Pick<Spotlight, "thumbnail_url" | "video_url" | "video_provider">): string | null {
  if (s.thumbnail_url) return s.thumbnail_url;
  if (s.video_provider === "youtube") {
    const id = getYouTubeId(s.video_url);
    if (id) return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }
  return null;
}

export function isMp4(s: Pick<Spotlight, "video_provider">): boolean {
  return s.video_provider === "mp4";
}

export function isInstagram(s: Pick<Spotlight, "video_provider">): boolean {
  return s.video_provider === "instagram";
}
