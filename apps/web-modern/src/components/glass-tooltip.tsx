"use client";

import { ReactNode } from "react";
import { Tooltip, TooltipProps } from "@heroui/react";

export interface GlassTooltipProps extends Omit<TooltipProps, "content"> {
  content: ReactNode;
  children: ReactNode;
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end"
    | "right-start"
    | "right-end";
  delay?: number;
  closeDelay?: number;
  showArrow?: boolean;
}

export function GlassTooltip({
  content,
  children,
  placement = "top",
  delay = 0,
  closeDelay = 0,
  showArrow = true,
  ...props
}: GlassTooltipProps) {
  return (
    <Tooltip
      content={content}
      placement={placement}
      delay={delay}
      closeDelay={closeDelay}
      showArrow={showArrow}
      classNames={{
        base: "bg-zinc-900/95 backdrop-blur-xl border border-white/10",
        content: "text-white/90 text-sm px-3 py-2",
        arrow: "bg-zinc-900/95 border-white/10",
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
}

// Icon with tooltip helper
export interface IconTooltipProps {
  icon: ReactNode;
  tooltip: string;
  placement?: GlassTooltipProps["placement"];
}

export function IconWithTooltip({ icon, tooltip, placement = "top" }: IconTooltipProps) {
  return (
    <GlassTooltip content={tooltip} placement={placement}>
      <span className="cursor-help">{icon}</span>
    </GlassTooltip>
  );
}

export { Tooltip };
