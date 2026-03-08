"use client";

import { ReactNode, forwardRef } from "react";
import {
  Input,
  Textarea,
  InputProps,
  TextAreaProps,
} from "@heroui/react";

// Shared glass input class names
const glassInputClasses = {
  label: "text-white/70",
  input: "text-white placeholder:text-white/30",
  inputWrapper: [
    "bg-white/5",
    "border border-white/10",
    "hover:bg-white/10",
    "group-data-[focus=true]:bg-white/10",
    "group-data-[focus=true]:border-indigo-500/50",
  ],
  description: "text-white/40",
  errorMessage: "text-red-400",
};

export interface GlassInputProps extends Omit<InputProps, "classNames"> {
  variant?: "flat" | "bordered" | "faded" | "underlined";
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ variant = "flat", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        variant={variant}
        classNames={glassInputClasses}
        {...props}
      />
    );
  }
);

GlassInput.displayName = "GlassInput";

export interface GlassTextareaProps extends Omit<TextAreaProps, "classNames"> {
  variant?: "flat" | "bordered" | "faded" | "underlined";
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ variant = "flat", ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        variant={variant}
        classNames={glassInputClasses}
        {...props}
      />
    );
  }
);

GlassTextarea.displayName = "GlassTextarea";

// Search input variant
export interface GlassSearchInputProps extends Omit<GlassInputProps, "type"> {
  onSearch?: (value: string) => void;
}

export function GlassSearchInput({ onSearch, onKeyDown, ...props }: GlassSearchInputProps) {
  return (
    <GlassInput
      type="search"
      onKeyDown={(e) => {
        if (e.key === "Enter" && onSearch) {
          onSearch((e.target as HTMLInputElement).value);
        }
        onKeyDown?.(e);
      }}
      {...props}
    />
  );
}

// Password input with show/hide toggle
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface GlassPasswordInputProps extends Omit<GlassInputProps, "type" | "endContent"> {
  showToggle?: boolean;
}

export function GlassPasswordInput({ showToggle = true, ...props }: GlassPasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <GlassInput
      type={isVisible ? "text" : "password"}
      endContent={
        showToggle && (
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )
      }
      {...props}
    />
  );
}

// Number input with increment/decrement
export interface GlassNumberInputProps {
  min?: number;
  max?: number;
  step?: number;
  showControls?: boolean;
  value?: number | string;
  onNumberChange?: (value: number) => void;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  errorMessage?: string;
  description?: string;
  startContent?: React.ReactNode;
  className?: string;
}

export function GlassNumberInput({
  min,
  max,
  step = 1,
  showControls = true,
  value,
  onNumberChange,
  ...props
}: GlassNumberInputProps) {
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : (value as number) || 0;

  const handleChange = (newValue: number) => {
    if (min !== undefined && newValue < min) return;
    if (max !== undefined && newValue > max) return;
    onNumberChange?.(newValue);
  };

  return (
    <GlassInput
      type="number"
      min={min}
      max={max}
      step={step}
      value={String(value ?? "")}
      onChange={(e) => onNumberChange?.(parseFloat(e.target.value) || 0)}
      endContent={
        showControls && (
          <div className="flex flex-col -my-2">
            <button
              type="button"
              onClick={() => handleChange(numValue + step)}
              className="px-2 text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleChange(numValue - step)}
              className="px-2 text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )
      }
      {...props}
    />
  );
}

export { Input, Textarea };
