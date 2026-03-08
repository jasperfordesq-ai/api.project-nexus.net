"use client";

import { ReactNode } from "react";
import { ScrollShadow, ScrollShadowProps } from "@heroui/react";

export interface GlassScrollShadowProps extends Omit<ScrollShadowProps, "classNames"> {
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  size?: number;
  hideScrollBar?: boolean;
  offset?: number;
}

export function GlassScrollShadow({
  children,
  orientation = "vertical",
  size = 40,
  hideScrollBar = false,
  offset = 0,
  className = "",
  ...props
}: GlassScrollShadowProps) {
  return (
    <ScrollShadow
      orientation={orientation}
      size={size}
      hideScrollBar={hideScrollBar}
      offset={offset}
      className={`${className}`}
      classNames={{
        base: "[--scroll-shadow-size:40px]",
      }}
      style={{
        // Custom gradient for glass effect
        ["--tw-shadow-color" as string]: "rgba(0,0,0,0.5)",
      }}
      {...props}
    >
      {children}
    </ScrollShadow>
  );
}

// Scrollable container with glass styling
export interface GlassScrollContainerProps {
  children: ReactNode;
  maxHeight?: string | number;
  className?: string;
  hideScrollBar?: boolean;
}

export function GlassScrollContainer({
  children,
  maxHeight = 400,
  className = "",
  hideScrollBar = false,
}: GlassScrollContainerProps) {
  return (
    <GlassScrollShadow
      hideScrollBar={hideScrollBar}
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 ${className}`}
      style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
    >
      {children}
    </GlassScrollShadow>
  );
}

export { ScrollShadow };
