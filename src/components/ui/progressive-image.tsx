import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
}

/**
 * Renders a blur-up placeholder that fades into the full image once loaded.
 * Uses a tiny inline SVG as the placeholder to avoid extra network requests.
 */
const ProgressiveImage = ({
  src,
  alt,
  className,
  placeholderColor,
  ...props
}: ProgressiveImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle already-cached images
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  // Reset on src change
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  // Generate a subtle placeholder SVG (tiny, inline, no network cost)
  const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23${(placeholderColor || "1a1a1a").replace("#", "")}'/%3E%3C/svg%3E`;

  return (
    <div className="relative overflow-hidden w-full h-full">
      {/* Blurred placeholder background */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700 ease-out",
          loaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          backgroundImage: `url("${placeholderSvg}")`,
          backgroundSize: "cover",
          filter: "blur(20px)",
          transform: "scale(1.1)",
        }}
        aria-hidden="true"
      />

      {/* Shimmer animation while loading */}
      {!loaded && (
        <div
          className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
};

export default ProgressiveImage;
