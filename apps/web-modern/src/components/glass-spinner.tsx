"use client";

import { Spinner, SpinnerProps } from "@heroui/react";
import { Loader2 } from "lucide-react";

export interface GlassSpinnerProps extends Omit<SpinnerProps, "classNames"> {
  size?: "sm" | "md" | "lg";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "white";
  label?: string;
  labelPosition?: "bottom" | "right";
}

const colorClasses = {
  default: "text-white/50",
  primary: "text-indigo-500",
  secondary: "text-purple-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  white: "text-white",
};

export function GlassSpinner({
  size = "md",
  color = "primary",
  label,
  labelPosition = "bottom",
  ...props
}: GlassSpinnerProps) {
  return (
    <Spinner
      size={size}
      label={label}
      classNames={{
        base: labelPosition === "right" ? "flex-row gap-3" : "",
        circle1: `border-b-current ${colorClasses[color]}`,
        circle2: `border-b-current ${colorClasses[color]}`,
        label: "text-white/60",
      }}
      {...props}
    />
  );
}

// Page loading spinner
export interface PageLoaderProps {
  text?: string;
}

export function PageLoader({ text = "Loading..." }: PageLoaderProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center">
      <GlassSpinner size="lg" color="primary" />
      <p className="mt-4 text-white/50">{text}</p>
    </div>
  );
}

// Full screen loader
export interface FullScreenLoaderProps {
  text?: string;
  showBackground?: boolean;
}

export function FullScreenLoader({
  text = "Loading...",
  showBackground = true,
}: FullScreenLoaderProps) {
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${
        showBackground ? "bg-zinc-950/90 backdrop-blur-sm" : ""
      }`}
    >
      <GlassSpinner size="lg" color="primary" />
      <p className="mt-4 text-white/70">{text}</p>
    </div>
  );
}

// Inline loader (for buttons, etc.)
export interface InlineLoaderProps {
  size?: "sm" | "md";
  className?: string;
}

export function InlineLoader({ size = "sm", className = "" }: InlineLoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

// Skeleton pulse loader
export interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  className?: string;
}

const roundedClasses = {
  none: "",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function SkeletonLoader({
  width,
  height,
  rounded = "md",
  className = "",
}: SkeletonLoaderProps) {
  return (
    <div
      className={`bg-white/10 animate-pulse ${roundedClasses[rounded]} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

// Content skeleton (for cards)
export interface ContentSkeletonProps {
  lines?: number;
  showAvatar?: boolean;
  showImage?: boolean;
}

export function ContentSkeleton({
  lines = 3,
  showAvatar = false,
  showImage = false,
}: ContentSkeletonProps) {
  return (
    <div className="space-y-4">
      {showImage && <SkeletonLoader height={150} rounded="lg" className="w-full" />}
      <div className="flex items-start gap-3">
        {showAvatar && <SkeletonLoader width={40} height={40} rounded="full" />}
        <div className="flex-1 space-y-2">
          <SkeletonLoader height={16} className="w-3/4" />
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonLoader
              key={i}
              height={12}
              className={i === lines - 1 ? "w-1/2" : "w-full"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { Spinner };
