import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight, Film } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { type Spotlight, getEmbedUrl, getPosterUrl, isMp4, isInstagram } from "@/lib/spotlightVideo";
import { trackSpotlight, type SpotlightSurface } from "@/lib/spotlightAnalytics";

interface SpotlightCardProps {
  spotlight: Spotlight;
  surface: SpotlightSurface;
  propertySlug?: string | null;
  variant?: "featured" | "compact";
  className?: string;
}

export default function SpotlightCard({ spotlight, surface, propertySlug, variant = "featured", className }: SpotlightCardProps) {
  const { language, isRTL } = useLanguage();
  const locale = language === "ar" ? "ar" : "en";
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const impressed = useRef(false);
  const milestones = useRef<Set<string>>(new Set());

  const title = locale === "ar" ? spotlight.title_ar || spotlight.title_en : spotlight.title_en;
  const hook = locale === "ar" ? spotlight.hook_ar || spotlight.hook_en : spotlight.hook_en;
  const community = locale === "ar" ? spotlight.community_ar || spotlight.community_en : spotlight.community_en;
  const poster = getPosterUrl(spotlight);
  const embedUrl = getEmbedUrl(spotlight);

  // Impression — once per card per page load.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || impressed.current) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !impressed.current) {
          impressed.current = true;
          trackSpotlight({ spotlightId: spotlight.id, eventType: "impression", surface, locale });
          io.disconnect();
        }
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [spotlight.id, surface, locale]);

  const handlePlay = () => {
    trackSpotlight({ spotlightId: spotlight.id, eventType: "play", surface, locale });
    // Instagram: open the reel in a new tab (inline embeds are unreliable).
    if (isInstagram(spotlight)) {
      window.open(spotlight.video_url, "_blank", "noopener,noreferrer");
      return;
    }
    setPlaying(true);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    ([25, 50, 75, 100] as const).forEach((m) => {
      const key = `progress_${m}`;
      if (pct >= m && !milestones.current.has(key)) {
        milestones.current.add(key);
        trackSpotlight({ spotlightId: spotlight.id, eventType: key as any, surface, locale });
      }
    });
  };

  const handleClickThrough = () => {
    trackSpotlight({ spotlightId: spotlight.id, eventType: "click_through", surface, locale });
  };

  const titleSize = variant === "featured" ? "text-xl md:text-2xl" : "text-base";

  return (
    <div ref={containerRef} className={cn("group flex flex-col", className)}>
      {/* Player / poster — aspect-ratio container avoids layout shift */}
      <div className="relative w-full overflow-hidden bg-secondary border border-border" style={{ aspectRatio: "16 / 9" }}>
        {playing && !isInstagram(spotlight) ? (
          isMp4(spotlight) ? (
            <video
              ref={videoRef}
              src={spotlight.video_url}
              className="w-full h-full object-cover"
              controls
              autoPlay
              muted
              playsInline
              preload="none"
              onTimeUpdate={handleTimeUpdate}
            />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={title}
            />
          ) : null
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
            aria-label={`Play ${title}`}
          >
            {poster ? (
              <img src={poster} alt={title} loading="lazy" className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Film className="w-10 h-10 text-muted-foreground" strokeWidth={1} />
              </div>
            )}
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <span className="relative w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center group-hover:bg-accent transition-colors shadow-lg">
              <Play className="w-7 h-7 text-accent-foreground ms-1" fill="currentColor" />
            </span>
          </button>
        )}
      </div>

      {/* Meta */}
      <div className={cn("pt-4", isRTL && "text-end")}>
        {community && (
          <p className="text-eyebrow text-accent mb-1">{community}</p>
        )}
        <h3 className={cn("heading-section text-foreground", titleSize)}>{title}</h3>
        {hook && variant === "featured" && (
          <p className="text-muted-foreground mt-2 leading-relaxed line-clamp-2">{hook}</p>
        )}
        {propertySlug && (
          <Link
            to={`/property/${propertySlug}`}
            onClick={handleClickThrough}
            className="inline-flex items-center gap-1 text-accent hover:underline text-sm mt-3"
          >
            {language === "ar" ? "عرض المشروع" : "View project"}
            <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
          </Link>
        )}
      </div>
    </div>
  );
}
