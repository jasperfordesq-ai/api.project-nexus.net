"use client";

import { ReactNode } from "react";
import { Link as HeroLink, LinkProps as HeroLinkProps } from "@heroui/react";
import NextLink from "next/link";
import { ExternalLink } from "lucide-react";

export interface GlassLinkProps {
  href: string;
  children: ReactNode;
  isExternal?: boolean;
  showExternalIcon?: boolean;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  underline?: "none" | "hover" | "always" | "active";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorClasses = {
  default: "text-white/70 hover:text-white",
  primary: "text-indigo-400 hover:text-indigo-300",
  secondary: "text-purple-400 hover:text-purple-300",
  success: "text-emerald-400 hover:text-emerald-300",
  warning: "text-amber-400 hover:text-amber-300",
  danger: "text-red-400 hover:text-red-300",
};

const underlineClasses = {
  none: "no-underline",
  hover: "no-underline hover:underline",
  always: "underline",
  active: "no-underline active:underline",
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function GlassLink({
  href,
  children,
  isExternal = false,
  showExternalIcon = true,
  color = "primary",
  underline = "hover",
  size = "md",
  className: extraClassName = "",
}: GlassLinkProps) {
  // Check if external link
  const isExternalLink = isExternal || href.startsWith("http") || href.startsWith("//");

  const className = `inline-flex items-center gap-1 transition-colors ${colorClasses[color]} ${underlineClasses[underline]} ${sizeClasses[size]} ${extraClassName}`;

  if (isExternalLink) {
    return (
      <HeroLink
        href={href}
        isExternal
        showAnchorIcon={false}
        className={className}
      >
        {children}
        {showExternalIcon && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
      </HeroLink>
    );
  }

  return (
    <NextLink href={href} className={className}>
      {children}
    </NextLink>
  );
}

// Block link (card that's clickable)
export interface GlassBlockLinkProps {
  href: string;
  children: ReactNode;
  isExternal?: boolean;
  className?: string;
}

export function GlassBlockLink({
  href,
  children,
  isExternal = false,
  className = "",
}: GlassBlockLinkProps) {
  const isExternalLink = isExternal || href.startsWith("http");
  const baseClass = `block rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-white/20 transition-all ${className}`;

  if (isExternalLink) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClass}
      >
        {children}
      </a>
    );
  }

  return (
    <NextLink href={href} className={baseClass}>
      {children}
    </NextLink>
  );
}

// Nav link with active state
export interface GlassNavLinkProps {
  href: string;
  children: ReactNode;
  isActive?: boolean;
  icon?: ReactNode;
}

export function GlassNavLink({
  href,
  children,
  isActive = false,
  icon,
}: GlassNavLinkProps) {
  return (
    <NextLink
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? "bg-indigo-500/20 text-indigo-400"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon && <span className={isActive ? "text-indigo-400" : "text-white/40"}>{icon}</span>}
      {children}
    </NextLink>
  );
}

export { HeroLink as Link };
