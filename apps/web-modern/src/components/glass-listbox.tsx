"use client";

import { ReactNode, Key } from "react";
import {
  Listbox,
  ListboxItem,
  ListboxSection,
  ListboxProps,
  Selection,
} from "@heroui/react";

export interface ListboxOption {
  key: string;
  label: string;
  description?: string;
  startContent?: ReactNode;
  endContent?: ReactNode;
  href?: string;
  isDisabled?: boolean;
  isDanger?: boolean;
}

export interface ListboxSectionData {
  key: string;
  title?: string;
  items: ListboxOption[];
}

export interface GlassListboxProps extends Omit<ListboxProps, "children"> {
  items?: ListboxOption[];
  sections?: ListboxSectionData[];
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  onAction?: (key: Key) => void;
  emptyContent?: ReactNode;
  variant?: "flat" | "bordered" | "faded";
}

export function GlassListbox({
  items,
  sections,
  selectionMode = "none",
  selectedKeys,
  onSelectionChange,
  onAction,
  emptyContent = "No items",
  variant = "flat",
  ...props
}: GlassListboxProps) {
  const itemClasses = {
    base: "text-white/80 data-[hover=true]:bg-white/5 data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-white rounded-lg px-3 py-2",
    title: "text-white/80",
    description: "text-white/50 text-sm",
    selectedIcon: "text-indigo-400",
  };

  const renderItem = (item: ListboxOption) => (
    <ListboxItem
      key={item.key}
      description={item.description}
      startContent={item.startContent}
      endContent={item.endContent}
      href={item.href}
      isDisabled={item.isDisabled}
      className={item.isDanger ? "text-red-400 data-[hover=true]:bg-red-500/10" : ""}
      classNames={itemClasses}
    >
      {item.label}
    </ListboxItem>
  );

  return (
    <Listbox
      aria-label="Options"
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      onAction={onAction}
      emptyContent={<p className="text-white/50 text-center py-4">{emptyContent}</p>}
      variant={variant}
      classNames={{
        base: "p-0",
        list: "gap-1",
      }}
      {...props}
    >
      {sections
        ? sections.map((section) => (
            <ListboxSection
              key={section.key}
              title={section.title}
              classNames={{
                heading: "text-white/50 text-xs uppercase tracking-wider px-3 py-2",
                group: "gap-1",
              }}
            >
              {section.items.map(renderItem)}
            </ListboxSection>
          ))
        : (items || []).map(renderItem)}
    </Listbox>
  );
}

// Navigation menu listbox
export interface NavMenuProps {
  items: {
    key: string;
    label: string;
    icon?: ReactNode;
    href?: string;
    onClick?: () => void;
    isDanger?: boolean;
  }[];
  activeKey?: string;
}

export function GlassNavMenu({ items, activeKey }: NavMenuProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-2">
      <GlassListbox
        items={items.map((item) => ({
          key: item.key,
          label: item.label,
          startContent: item.icon ? (
            <span className="text-white/50">{item.icon}</span>
          ) : undefined,
          href: item.href,
          isDanger: item.isDanger,
        }))}
        selectionMode="single"
        selectedKeys={activeKey ? new Set([activeKey]) : new Set()}
        onAction={(key) => {
          const item = items.find((i) => i.key === key);
          item?.onClick?.();
        }}
      />
    </div>
  );
}

export { Listbox, ListboxItem, ListboxSection };
