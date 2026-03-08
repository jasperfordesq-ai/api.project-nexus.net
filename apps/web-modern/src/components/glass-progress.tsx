"use client";

import { ReactNode } from "react";
import {
  Progress,
  CircularProgress,
  ProgressProps,
  CircularProgressProps,
} from "@heroui/react";

export interface GlassProgressProps extends Omit<ProgressProps, "classNames"> {
  label?: string;
  showValueLabel?: boolean;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
}

const colorStyles = {
  default: "bg-white",
  primary: "bg-gradient-to-r from-indigo-500 to-purple-500",
  secondary: "bg-gradient-to-r from-purple-500 to-pink-500",
  success: "bg-gradient-to-r from-emerald-500 to-teal-500",
  warning: "bg-gradient-to-r from-amber-500 to-orange-500",
  danger: "bg-gradient-to-r from-red-500 to-rose-500",
};

export function GlassProgress({
  label,
  showValueLabel = true,
  color = "primary",
  size = "md",
  radius = "full",
  value,
  ...props
}: GlassProgressProps) {
  return (
    <Progress
      label={label}
      showValueLabel={showValueLabel}
      value={value}
      size={size}
      radius={radius}
      classNames={{
        base: "max-w-full",
        track: "bg-white/10 border border-white/5",
        indicator: colorStyles[color],
        label: "text-white/70 text-sm",
        value: "text-white/70 text-sm",
      }}
      {...props}
    />
  );
}

// Circular progress
export interface GlassCircularProgressProps extends Omit<CircularProgressProps, "classNames"> {
  label?: string;
  showValueLabel?: boolean;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

const circularColorStyles = {
  default: "stroke-white",
  primary: "stroke-indigo-500",
  secondary: "stroke-purple-500",
  success: "stroke-emerald-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
};

export function GlassCircularProgress({
  label,
  showValueLabel = true,
  color = "primary",
  size = "md",
  value,
  ...props
}: GlassCircularProgressProps) {
  return (
    <CircularProgress
      label={label}
      showValueLabel={showValueLabel}
      value={value}
      size={size}
      classNames={{
        svg: "w-full h-full",
        track: "stroke-white/10",
        indicator: circularColorStyles[color],
        label: "text-white/70 text-sm",
        value: "text-white font-semibold text-lg",
      }}
      {...props}
    />
  );
}

// Stats card with progress
export interface ProgressStatProps {
  label: string;
  value: number;
  maxValue?: number;
  suffix?: string;
  color?: GlassProgressProps["color"];
  showBar?: boolean;
}

export function ProgressStat({
  label,
  value,
  maxValue = 100,
  suffix = "",
  color = "primary",
  showBar = true,
}: ProgressStatProps) {
  const percentage = Math.round((value / maxValue) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-white/70 text-sm">{label}</span>
        <span className="text-white font-semibold">
          {value.toLocaleString()}
          {suffix}
          {maxValue !== 100 && (
            <span className="text-white/50 text-sm font-normal">
              {" "}
              / {maxValue.toLocaleString()}
            </span>
          )}
        </span>
      </div>
      {showBar && (
        <GlassProgress value={percentage} showValueLabel={false} color={color} size="sm" />
      )}
    </div>
  );
}

// XP/Level progress bar (specific for gamification)
export interface LevelProgressProps {
  currentXP: number;
  requiredXP: number;
  level: number;
}

export function LevelProgress({ currentXP, requiredXP, level }: LevelProgressProps) {
  const percentage = Math.round((currentXP / requiredXP) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white font-medium">Level {level}</span>
        <span className="text-white/50 text-sm">
          {currentXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
        </span>
      </div>
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </div>
  );
}

export { Progress, CircularProgress };
