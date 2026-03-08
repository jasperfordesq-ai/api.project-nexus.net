"use client";

import { ReactNode } from "react";
import {
  Checkbox,
  CheckboxGroup,
  CheckboxProps,
  CheckboxGroupProps,
} from "@heroui/react";
import { Check } from "lucide-react";

export interface GlassCheckboxProps extends CheckboxProps {
  label?: string;
  description?: string;
}

export function GlassCheckbox({
  label,
  description,
  children,
  ...props
}: GlassCheckboxProps) {
  return (
    <Checkbox
      classNames={{
        base: "inline-flex max-w-full w-full bg-white/5 m-0 hover:bg-white/10 items-center justify-start cursor-pointer rounded-xl gap-3 p-4 border border-white/10 data-[selected=true]:border-indigo-500/50",
        label: "w-full text-white",
        wrapper: "before:border-white/30 after:bg-indigo-500 group-data-[selected=true]:after:bg-indigo-500",
        icon: "text-white",
      }}
      {...props}
    >
      {children || (
        <div>
          <p className="text-white">{label}</p>
          {description && <p className="text-sm text-white/50">{description}</p>}
        </div>
      )}
    </Checkbox>
  );
}

// Simple checkbox without card styling
export function GlassCheckboxSimple({ label, ...props }: GlassCheckboxProps) {
  return (
    <Checkbox
      classNames={{
        base: "inline-flex items-center gap-2 cursor-pointer",
        label: "text-white/80",
        wrapper: "before:border-white/30 after:bg-indigo-500",
        icon: "text-white",
      }}
      {...props}
    >
      {label}
    </Checkbox>
  );
}

export interface CheckboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface GlassCheckboxGroupProps extends Omit<CheckboxGroupProps, "children"> {
  options: CheckboxOption[];
  label?: string;
  orientation?: "horizontal" | "vertical";
  isCardStyle?: boolean;
}

export function GlassCheckboxGroup({
  options,
  label,
  orientation = "vertical",
  isCardStyle = true,
  ...props
}: GlassCheckboxGroupProps) {
  return (
    <CheckboxGroup
      label={label}
      orientation={orientation}
      classNames={{
        label: "text-white/70 text-sm mb-2",
        wrapper: orientation === "vertical" ? "gap-2" : "gap-4",
      }}
      {...props}
    >
      {options.map((option) =>
        isCardStyle ? (
          <GlassCheckbox
            key={option.value}
            value={option.value}
            label={option.label}
            description={option.description}
          />
        ) : (
          <GlassCheckboxSimple
            key={option.value}
            value={option.value}
            label={option.label}
          />
        )
      )}
    </CheckboxGroup>
  );
}

export { Checkbox, CheckboxGroup };
