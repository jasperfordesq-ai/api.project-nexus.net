"use client";

import { ReactNode } from "react";
import { User, UserProps, Avatar } from "@heroui/react";

export interface GlassUserProps extends Omit<UserProps, "classNames"> {
  size?: "sm" | "md" | "lg";
  showBorder?: boolean;
  isOnline?: boolean;
}

export function GlassUser({
  name,
  description,
  avatarProps,
  size = "md",
  showBorder = true,
  isOnline,
  ...props
}: GlassUserProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <User
      name={name}
      description={description}
      avatarProps={{
        ...avatarProps,
        className: `${showBorder ? "ring-2 ring-white/10" : ""} ${avatarProps?.className || ""}`,
        isBordered: false,
      }}
      classNames={{
        base: "gap-3",
        name: `text-white font-medium ${sizeClasses[size]}`,
        description: "text-white/50 text-sm",
        wrapper: "flex flex-col",
      }}
      {...props}
    />
  );
}

// User Card - for profile previews
export interface GlassUserCardProps {
  name: string;
  description?: string;
  avatar?: string;
  stats?: { label: string; value: string | number }[];
  actions?: ReactNode;
  isOnline?: boolean;
}

export function GlassUserCard({
  name,
  description,
  avatar,
  stats,
  actions,
  isOnline,
}: GlassUserCardProps) {
  return (
    <div className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar
            src={avatar}
            name={name}
            size="lg"
            className="ring-2 ring-white/10"
          />
          {isOnline !== undefined && (
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                isOnline ? "bg-emerald-500" : "bg-zinc-500"
              }`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{name}</h3>
          {description && (
            <p className="text-sm text-white/50 truncate">{description}</p>
          )}
          {stats && stats.length > 0 && (
            <div className="flex gap-4 mt-2">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-white font-semibold">{stat.value}</p>
                  <p className="text-xs text-white/40">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="mt-4 pt-4 border-t border-white/10">{actions}</div>}
    </div>
  );
}

// Compact user display
export interface GlassUserCompactProps {
  name: string;
  avatar?: string;
  subtitle?: string;
  endContent?: ReactNode;
  onClick?: () => void;
}

export function GlassUserCompact({
  name,
  avatar,
  subtitle,
  endContent,
  onClick,
}: GlassUserCompactProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-lg ${
        onClick ? "hover:bg-white/5 transition-colors cursor-pointer w-full text-left" : ""
      }`}
    >
      <Avatar src={avatar} name={name} size="sm" className="ring-1 ring-white/10" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{name}</p>
        {subtitle && <p className="text-xs text-white/50 truncate">{subtitle}</p>}
      </div>
      {endContent}
    </Wrapper>
  );
}

export { User, Avatar };
