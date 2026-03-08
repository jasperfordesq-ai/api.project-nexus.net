"use client";

import { ReactNode } from "react";
import { Divider, DividerProps } from "@heroui/react";

export interface GlassDividerProps extends Omit<DividerProps, "classNames"> {
  orientation?: "horizontal" | "vertical";
  text?: string;
  textPosition?: "start" | "center" | "end";
}

export function GlassDivider({
  orientation = "horizontal",
  text,
  textPosition = "center",
  className = "",
  ...props
}: GlassDividerProps) {
  if (text) {
    const positionClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
    };

    return (
      <div className={`flex items-center gap-4 ${positionClasses[textPosition]} ${className}`}>
        {textPosition !== "start" && (
          <Divider className="bg-white/10 flex-1" {...props} />
        )}
        <span className="text-white/40 text-sm whitespace-nowrap">{text}</span>
        {textPosition !== "end" && (
          <Divider className="bg-white/10 flex-1" {...props} />
        )}
      </div>
    );
  }

  return (
    <Divider
      orientation={orientation}
      className={`bg-white/10 ${className}`}
      {...props}
    />
  );
}

// Styled spacer divider
export interface GlassSpacerProps {
  size?: "sm" | "md" | "lg" | "xl";
  showLine?: boolean;
}

const spacerSizes = {
  sm: "my-2",
  md: "my-4",
  lg: "my-8",
  xl: "my-12",
};

export function GlassSpacer({ size = "md", showLine = false }: GlassSpacerProps) {
  if (showLine) {
    return (
      <div className={spacerSizes[size]}>
        <GlassDivider />
      </div>
    );
  }

  return <div className={spacerSizes[size]} />;
}

// Section divider with title
export interface SectionDividerProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionDivider({ title, subtitle, action }: SectionDividerProps) {
  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
        </div>
        {action}
      </div>
      <GlassDivider />
    </div>
  );
}

export { Divider };
