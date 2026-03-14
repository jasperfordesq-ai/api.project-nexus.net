// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarProps } from "@heroui/react";

/**
 * Deterministic color from a name string.
 * Returns a Tailwind-compatible gradient class pair.
 */
const GRADIENT_PAIRS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-lime-500 to-green-600",
  "from-sky-500 to-indigo-600",
];

function nameToGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export interface AvatarWithFallbackProps extends Omit<AvatarProps, "fallback"> {
  /** Full display name, used for initials fallback and color seeding */
  name: string;
  /** Image source URL */
  src?: string;
}

/**
 * Avatar component with graceful fallback to colored initials
 * when the image src fails to load or is not provided.
 *
 * Wraps HeroUI Avatar with an onError handler and a deterministic
 * gradient background based on the user's name.
 */
export function AvatarWithFallback({
  name,
  src,
  className,
  ...props
}: AvatarWithFallbackProps) {
  const [imgError, setImgError] = useState(false);

  const initials = useMemo(() => getInitials(name), [name]);
  const gradient = useMemo(() => nameToGradient(name), [name]);

  const effectiveSrc = src && !imgError ? src : undefined;

  return (
    <Avatar
      name={name}
      src={effectiveSrc}
      showFallback={!effectiveSrc}
      fallback={
        <div
          className={`flex items-center justify-center w-full h-full bg-gradient-to-br ${gradient} text-white font-semibold`}
        >
          {initials}
        </div>
      }
      imgProps={{
        onError: () => setImgError(true),
      }}
      className={className}
      {...props}
    />
  );
}
