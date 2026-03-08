"use client";

import { ReactNode } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverProps,
} from "@heroui/react";

export interface GlassPopoverProps extends Omit<PopoverProps, "children"> {
  trigger: ReactNode;
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
  showArrow?: boolean;
  offset?: number;
  glow?: "none" | "primary" | "secondary" | "accent";
}

const glowStyles = {
  none: "",
  primary: "shadow-[0_0_20px_rgba(99,102,241,0.1)]",
  secondary: "shadow-[0_0_20px_rgba(168,85,247,0.1)]",
  accent: "shadow-[0_0_20px_rgba(6,182,212,0.1)]",
};

export function GlassPopover({
  trigger,
  children,
  placement = "bottom",
  showArrow = true,
  offset = 10,
  glow = "none",
  ...props
}: GlassPopoverProps) {
  return (
    <Popover
      placement={placement}
      showArrow={showArrow}
      offset={offset}
      classNames={{
        base: `bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl ${glowStyles[glow]}`,
        content: "p-0",
        arrow: "bg-zinc-900/95 border-white/10",
      }}
      {...props}
    >
      <PopoverTrigger>{trigger}</PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  );
}

// Menu Popover - for dropdown-like menus
export interface PopoverMenuItemProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  isDanger?: boolean;
  isDisabled?: boolean;
}

export interface GlassPopoverMenuProps extends Omit<GlassPopoverProps, "children"> {
  items: PopoverMenuItemProps[];
}

export function GlassPopoverMenu({ items, ...props }: GlassPopoverMenuProps) {
  return (
    <GlassPopover {...props}>
      <div className="py-2 min-w-[200px]">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            disabled={item.isDisabled}
            className={`w-full px-4 py-2 flex items-center gap-3 transition-colors text-left
              ${item.isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5"}
              ${item.isDanger ? "text-red-400 hover:bg-red-500/10" : "text-white/80"}
            `}
          >
            {item.icon && (
              <span className={item.isDanger ? "text-red-400" : "text-white/50"}>
                {item.icon}
              </span>
            )}
            <div>
              <p className="text-sm">{item.label}</p>
              {item.description && (
                <p className="text-xs text-white/40">{item.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </GlassPopover>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
