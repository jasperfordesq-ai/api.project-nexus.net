"use client";

import { ReactNode } from "react";
import { Badge, BadgeProps } from "@heroui/react";

export interface GlassBadgeProps extends Omit<BadgeProps, "classNames"> {
  variant?: "solid" | "flat" | "faded" | "shadow";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  placement?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const colorClasses = {
  default: "bg-white/20 text-white",
  primary: "bg-indigo-500 text-white",
  secondary: "bg-purple-500 text-white",
  success: "bg-emerald-500 text-white",
  warning: "bg-amber-500 text-white",
  danger: "bg-red-500 text-white",
};

export function GlassBadge({
  children,
  content,
  variant = "solid",
  color = "primary",
  size = "md",
  placement = "top-right",
  ...props
}: GlassBadgeProps) {
  return (
    <Badge
      content={content}
      variant={variant}
      size={size}
      placement={placement}
      classNames={{
        badge: `${colorClasses[color]} font-medium`,
      }}
      {...props}
    >
      {children}
    </Badge>
  );
}

// Notification dot badge
export interface NotificationBadgeProps {
  children: ReactNode;
  count?: number;
  showZero?: boolean;
  max?: number;
  isInvisible?: boolean;
  color?: "primary" | "secondary" | "success" | "warning" | "danger";
}

export function NotificationBadge({
  children,
  count = 0,
  showZero = false,
  max = 99,
  isInvisible = false,
  color = "danger",
}: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;
  const shouldShow = !isInvisible && (count > 0 || showZero);

  return (
    <GlassBadge
      content={displayCount}
      color={color}
      size="sm"
      isInvisible={!shouldShow}
    >
      {children}
    </GlassBadge>
  );
}

// Status dot (no number, just indicator)
export interface StatusDotProps {
  children: ReactNode;
  status?: "online" | "offline" | "busy" | "away";
  placement?: GlassBadgeProps["placement"];
}

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-zinc-500",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

export function StatusDot({ children, status = "online", placement = "bottom-right" }: StatusDotProps) {
  return (
    <Badge
      content=""
      placement={placement}
      classNames={{
        badge: `${statusColors[status]} min-w-[10px] min-h-[10px] w-2.5 h-2.5`,
      }}
    >
      {children}
    </Badge>
  );
}

// Inline badge/tag
export interface GlassTagProps {
  children: ReactNode;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  startContent?: ReactNode;
  endContent?: ReactNode;
  onClose?: () => void;
}

const tagColorClasses = {
  default: "bg-white/10 text-white/80",
  primary: "bg-indigo-500/20 text-indigo-400",
  secondary: "bg-purple-500/20 text-purple-400",
  success: "bg-emerald-500/20 text-emerald-400",
  warning: "bg-amber-500/20 text-amber-400",
  danger: "bg-red-500/20 text-red-400",
};

const tagSizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function GlassTag({
  children,
  color = "default",
  size = "md",
  startContent,
  endContent,
  onClose,
}: GlassTagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${tagColorClasses[color]} ${tagSizeClasses[size]}`}
    >
      {startContent}
      {children}
      {endContent}
      {onClose && (
        <button
          onClick={onClose}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

export { Badge };
