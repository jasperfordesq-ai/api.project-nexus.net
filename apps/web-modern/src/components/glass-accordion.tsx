"use client";

import { ReactNode } from "react";
import { Accordion, AccordionItem, AccordionProps } from "@heroui/react";
import { ChevronDown } from "lucide-react";

export interface GlassAccordionItemData {
  key: string;
  title: string;
  subtitle?: string;
  startContent?: ReactNode;
  children: ReactNode;
}

export interface GlassAccordionProps extends Omit<AccordionProps, "children"> {
  items: GlassAccordionItemData[];
  variant?: "light" | "bordered" | "shadow" | "splitted";
  selectionMode?: "none" | "single" | "multiple";
  defaultExpandedKeys?: string[];
}

export function GlassAccordion({
  items,
  variant = "bordered",
  selectionMode = "single",
  defaultExpandedKeys,
  ...props
}: GlassAccordionProps) {
  return (
    <Accordion
      variant={variant}
      selectionMode={selectionMode}
      defaultExpandedKeys={defaultExpandedKeys}
      className="px-0"
      itemClasses={{
        base: "py-0 w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl mb-2 px-4",
        title: "text-white font-medium",
        subtitle: "text-white/50 text-sm",
        trigger: "py-4 data-[hover=true]:bg-transparent",
        content: "text-white/70 pb-4",
        indicator: "text-white/50",
        startContent: "text-white/50",
      }}
      {...props}
    >
      {items.map((item) => (
        <AccordionItem
          key={item.key}
          aria-label={item.title}
          title={item.title}
          subtitle={item.subtitle}
          startContent={item.startContent}
        >
          {item.children}
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// FAQ-style accordion
export interface FAQItem {
  question: string;
  answer: string;
}

export interface GlassFAQProps {
  items: FAQItem[];
  allowMultiple?: boolean;
}

export function GlassFAQ({ items, allowMultiple = false }: GlassFAQProps) {
  return (
    <GlassAccordion
      items={items.map((item, index) => ({
        key: `faq-${index}`,
        title: item.question,
        children: <p>{item.answer}</p>,
      }))}
      selectionMode={allowMultiple ? "multiple" : "single"}
    />
  );
}

export { Accordion, AccordionItem };
