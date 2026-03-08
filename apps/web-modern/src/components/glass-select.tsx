"use client";

import { ReactNode, Key } from "react";
import {
  Select,
  SelectItem,
  SelectSection,
  SelectProps,
  Selection,
} from "@heroui/react";

// Shared glass select class names
const glassSelectClasses = {
  label: "text-white/70",
  value: "text-white",
  trigger: [
    "bg-white/5",
    "border border-white/10",
    "hover:bg-white/10",
    "data-[open=true]:bg-white/10",
    "data-[open=true]:border-indigo-500/50",
  ],
  innerWrapper: "text-white",
  selectorIcon: "text-white/50",
  popoverContent: "bg-zinc-900/95 backdrop-blur-xl border border-white/10",
  listbox: "p-0",
  listboxWrapper: "max-h-[300px]",
};

export interface SelectOption {
  key: string;
  label: string;
  description?: string;
  startContent?: ReactNode;
  endContent?: ReactNode;
  isDisabled?: boolean;
}

export interface SelectSectionData {
  key: string;
  title?: string;
  items: SelectOption[];
}

export interface GlassSelectProps extends Omit<SelectProps, "children" | "classNames"> {
  options?: SelectOption[];
  sections?: SelectSectionData[];
  placeholder?: string;
}

export function GlassSelect({
  options,
  sections,
  placeholder = "Select an option",
  ...props
}: GlassSelectProps) {
  const itemClasses = {
    base: "text-white/80 data-[hover=true]:bg-white/5 data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-white",
    title: "text-white/80",
    description: "text-white/50",
    selectedIcon: "text-indigo-400",
  };

  const renderItem = (item: SelectOption) => (
    <SelectItem
      key={item.key}
      description={item.description}
      startContent={item.startContent}
      endContent={item.endContent}
      isDisabled={item.isDisabled}
      classNames={itemClasses}
    >
      {item.label}
    </SelectItem>
  );

  return (
    <Select
      placeholder={placeholder}
      classNames={glassSelectClasses}
      listboxProps={{
        itemClasses: itemClasses,
      }}
      {...props}
    >
      {sections
        ? sections.map((section) => (
            <SelectSection
              key={section.key}
              title={section.title}
              classNames={{
                heading: "text-white/50 text-xs uppercase tracking-wider px-2 py-1",
              }}
            >
              {section.items.map(renderItem)}
            </SelectSection>
          ))
        : (options || []).map(renderItem)}
    </Select>
  );
}

// Multi-select variant
export interface GlassMultiSelectProps extends Omit<GlassSelectProps, "selectionMode"> {
  onSelectionChange?: (keys: Selection) => void;
}

export function GlassMultiSelect({ onSelectionChange, ...props }: GlassMultiSelectProps) {
  return (
    <GlassSelect
      selectionMode="multiple"
      onSelectionChange={onSelectionChange}
      {...props}
    />
  );
}

// Simple key-value select
export interface SimpleSelectOption {
  value: string;
  label: string;
}

export interface SimpleGlassSelectProps {
  options: SimpleSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  errorMessage?: string;
}

export function SimpleGlassSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  isRequired,
  isDisabled,
  errorMessage,
}: SimpleGlassSelectProps) {
  return (
    <GlassSelect
      label={label}
      placeholder={placeholder}
      isRequired={isRequired}
      isDisabled={isDisabled}
      errorMessage={errorMessage}
      selectedKeys={value ? new Set([value]) : new Set()}
      onSelectionChange={(keys) => {
        const selected = Array.from(keys as Set<string>)[0];
        if (selected) onChange?.(selected);
      }}
      options={options.map((opt) => ({
        key: opt.value,
        label: opt.label,
      }))}
    />
  );
}

export { Select, SelectItem, SelectSection };
