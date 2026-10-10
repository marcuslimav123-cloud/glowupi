import React, { useEffect, useState } from "react";

interface SafeLogoImageProps {
  src?: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  style?: React.CSSProperties;
}

export function SafeLogoImage({
  src,
  alt,
  className,
  fallbackSrc,
  style,
}: SafeLogoImageProps) {
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");
  const fallback = fallbackSrc || `${basePath}logo-icon.png`.replace(/\/+/g, "/");
  const initial = src && typeof src === "string" && src.trim() ? src : fallback;

  const [currentSrc, setCurrentSrc] = useState<string>(initial);

  useEffect(() => {
    setCurrentSrc(initial);
  }, [initial]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}
