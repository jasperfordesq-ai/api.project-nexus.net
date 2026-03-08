"use client";

import { ReactNode } from "react";
import {
  Radio,
  RadioGroup,
  RadioProps,
  RadioGroupProps,
} from "@heroui/react";

export interface GlassRadioProps extends RadioProps {
  label?: string;
  description?: string;
}

export function GlassRadio({
  label,
  description,
  children,
  ...props
}: GlassRadioProps) {
  return (
    <Radio
      classNames={{
        base: "inline-flex max-w-full w-full bg-white/5 m-0 hover:bg-white/10 items-center justify-start cursor-pointer rounded-xl gap-3 p-4 border border-white/10 data-[selected=true]:border-indigo-500/50",
        label: "w-full text-white",
        wrapper: "border-white/30 group-data-[selected=true]:border-indigo-500",
        control: "bg-indigo-500",
      }}
      {...props}
    >
      {children || (
        <div>
          <p className="text-white">{label}</p>
          {description && <p className="text-sm text-white/50">{description}</p>}
        </div>
      )}
    </Radio>
  );
}

// Simple radio without card styling
export function GlassRadioSimple({ label, ...props }: GlassRadioProps) {
  return (
    <Radio
      classNames={{
        base: "inline-flex items-center gap-2 cursor-pointer",
        label: "text-white/80",
        wrapper: "border-white/30 group-data-[selected=true]:border-indigo-500",
        control: "bg-indigo-500",
      }}
      {...props}
    >
      {label}
    </Radio>
  );
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface GlassRadioGroupProps extends Omit<RadioGroupProps, "children"> {
  options: RadioOption[];
  label?: string;
  orientation?: "horizontal" | "vertical";
  isCardStyle?: boolean;
}

export function GlassRadioGroup({
  options,
  label,
  orientation = "vertical",
  isCardStyle = true,
  ...props
}: GlassRadioGroupProps) {
  return (
    <RadioGroup
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
          <GlassRadio
            key={option.value}
            value={option.value}
            label={option.label}
            description={option.description}
          />
        ) : (
          <GlassRadioSimple
            key={option.value}
            value={option.value}
            label={option.label}
          />
        )
      )}
    </RadioGroup>
  );
}

export { Radio, RadioGroup };
