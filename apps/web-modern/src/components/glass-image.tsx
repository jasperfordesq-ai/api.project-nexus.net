"use client";

import { useState } from "react";
import { Image, ImageProps } from "@heroui/react";
import { ImageOff } from "lucide-react";

export interface GlassImageProps extends Omit<ImageProps, "classNames"> {
  fallback?: React.ReactNode;
  aspectRatio?: "square" | "video" | "wide" | "auto";
  showSkeleton?: boolean;
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[21/9]",
  auto: "",
};

export function GlassImage({
  src,
  alt,
  fallback,
  aspectRatio = "auto",
  showSkeleton = true,
  className = "",
  ...props
}: GlassImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div
        className={`bg-white/5 border border-white/10 rounded-xl flex items-center justify-center ${aspectRatioClasses[aspectRatio]} ${className}`}
      >
        {fallback || (
          <div className="text-center text-white/30">
            <ImageOff className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Image not available</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${aspectRatioClasses[aspectRatio]} ${className}`}>
      {loading && showSkeleton && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        classNames={{
          wrapper: "w-full h-full",
          img: `object-cover w-full h-full transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`,
        }}
        {...props}
      />
    </div>
  );
}

// Image gallery
export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface GlassImageGalleryProps {
  images: GalleryImage[];
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  onImageClick?: (index: number) => void;
}

const gapClasses = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

export function GlassImageGallery({
  images,
  columns = 3,
  gap = "md",
  onImageClick,
}: GlassImageGalleryProps) {
  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]}`}>
      {images.map((image, index) => (
        <button
          key={index}
          onClick={() => onImageClick?.(index)}
          className="group relative overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <GlassImage
            src={image.src}
            alt={image.alt}
            aspectRatio="square"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          {image.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-white text-sm">{image.caption}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// Avatar with image fallback
export interface GlassAvatarImageProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  showBorder?: boolean;
}

const avatarSizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function GlassAvatarImage({
  src,
  name,
  size = "md",
  showBorder = true,
}: GlassAvatarImageProps) {
  const [error, setError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (error || !src) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center font-medium text-indigo-300 ${avatarSizes[size]} ${showBorder ? "ring-2 ring-white/10" : ""}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className={`rounded-full object-cover ${avatarSizes[size]} ${showBorder ? "ring-2 ring-white/10" : ""}`}
    />
  );
}

export { Image };
