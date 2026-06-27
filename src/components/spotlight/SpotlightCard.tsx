import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Film, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { type Spotlight, getEmbedUrl, getPosterUrl, isMp4, isInstagram } from "@/lib/spotlightVideo";
import { trackSpotlight, type SpotlightSurface, type SpotlightEventType } from "@/lib/spotlightAnalytics";

interface SpotlightCardProps {
  spotlight: Spotlight;
  surface: SpotlightSurface;
  propertySlug?: string | null;
  className?: string;
}

/** Instagram-style portrait video tile: cover poster, gradient title overlay,
 *  hover play, click-to-play in place. Poster auto-derives from the video. */
export default function SpotlightCard({ spotlight, surface, propertySlug, className }: SpotlightCardProps) {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const locale = language === "ar" ? "ar" : "en";
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const impressed = useRef(false);
  const milestones = useRef<Set<string>>(new Set());

  const title = locale === "ar" ? spotlight.title_ar || spotlight.title_en : spotlight.title_en;
  const community = locale === "ar" ? spotlight.community_ar || spotlight.community_en : spotlight.community_en;
  const poster = getPosterUrl(spotlight);
  const embedUrl = getEmbedUrl(spotlight);
  // When no custom/derived poster exists for an MP4, show a frame from the file.
  const mp4FramePoster = !poster && isMp4(spotlight) ? `${spotlight.video_url}#t=0.5` : null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || impressed.current) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !impressed.current) {
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
        trackSpotlight({ spotlightId: spotlight.id, eventType: key as SpotlightEventType, surface, locale });
      }
    });
  };

  const goToProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!propertySlug) return;
    trackSpotlight({ spotlightId: spotlight.id, eventType: "click_through", surface, locale });
    navigate(`/property/${propertySlug}`);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-secondary shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        className,
      )}
      style={{ aspectRatio: "4 / 5" }}
    >
      {playing && !isInstagram(spotlight) ? (
        isMp4(spotlight) ? (
          <video
            ref={videoRef}
            src={spotlight.video_url}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            controls autoPlay muted playsInline preload="none"
            onTimeUpdate={handleTimeUpdate}
          />
        ) : embedUrl ? (
          <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={title} />
        ) : null
      ) : (
        <button type="button" onClick={handlePlay} className="absolute inset-0 w-full h-full text-start" aria-label={`Play ${title}`}>
          {/* Poster */}
          {poster ? (
            <img src={poster} alt={title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : mp4FramePoster ? (
            <video src={mp4FramePoster} preload="metadata" muted playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <Film className="w-10 h-10 text-muted-foreground" strokeWidth={1} />
            </div>
          )}

          {/* Gradient for legibility */}
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

          {/* Play badge */}
          <span className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 rtl:translate-x-1/2">
            <Play className="w-6 h-6 text-white ms-0.5" fill="currentColor" />
          </span>

          {/* Title overlay */}
          <span className={cn("absolute bottom-0 inset-x-0 p-4", isRTL && "text-end")}>
            {community && (
              <span className="block text-[11px] font-medium tracking-widest uppercase text-accent mb-1">{community}</span>
            )}
            <span className="block text-white font-serif text-lg leading-snug line-clamp-2 drop-shadow">{title}</span>
          </span>

          {/* View-project pill */}
          {propertySlug && (
            <span
              role="link"
              tabIndex={0}
              onClick={goToProject}
              onKeyDown={(e) => { if (e.key === "Enter") goToProject(e as unknown as React.MouseEvent); }}
              className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-white/90 text-foreground text-xs font-medium px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              {language === "ar" ? "المشروع" : "Project"}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}
