"use client";

import { ReactNode } from "react";
import {
  DatePicker,
  DateRangePicker,
  DatePickerProps,
  DateRangePickerProps,
  DateValue,
  RangeValue,
} from "@heroui/react";
import { Calendar } from "lucide-react";

// Glass DatePicker styling classNames
const glassDatePickerClasses = {
  base: "w-full",
  label: "text-white/70",
  input: "text-white",
  inputWrapper: [
    "bg-white/5",
    "border border-white/10",
    "hover:bg-white/10",
    "group-data-[focus=true]:bg-white/10",
    "group-data-[focus=true]:border-indigo-500/50",
  ],
  innerWrapper: "text-white",
  segment: "text-white data-[editable=true]:text-white data-[placeholder=true]:text-white/30",
  selectorButton: "text-white/50 hover:text-white",
  selectorIcon: "text-white/50",
  popoverContent: "bg-zinc-900/95 backdrop-blur-xl border border-white/10",
  calendar: "bg-transparent",
  calendarContent: "bg-transparent",
  timeInputLabel: "text-white/70",
  timeInput: "text-white",
};

export interface GlassDatePickerProps extends Omit<DatePickerProps, "classNames"> {
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  minValue?: DateValue;
  maxValue?: DateValue;
  granularity?: "day" | "hour" | "minute" | "second";
}

export function GlassDatePicker({
  label,
  placeholder = "Select date",
  isRequired = false,
  isDisabled = false,
  granularity = "day",
  ...props
}: GlassDatePickerProps) {
  return (
    <DatePicker
      label={label}
      isRequired={isRequired}
      isDisabled={isDisabled}
      granularity={granularity}
      classNames={glassDatePickerClasses}
      {...props}
    />
  );
}

export interface GlassDateRangePickerProps extends Omit<DateRangePickerProps, "classNames"> {
  label?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  minValue?: DateValue;
  maxValue?: DateValue;
  granularity?: "day" | "hour" | "minute" | "second";
}

export function GlassDateRangePicker({
  label,
  isRequired = false,
  isDisabled = false,
  granularity = "day",
  ...props
}: GlassDateRangePickerProps) {
  return (
    <DateRangePicker
      label={label}
      isRequired={isRequired}
      isDisabled={isDisabled}
      granularity={granularity}
      classNames={glassDatePickerClasses}
      {...props}
    />
  );
}

export { DatePicker, DateRangePicker };
export type { DateValue, RangeValue };
