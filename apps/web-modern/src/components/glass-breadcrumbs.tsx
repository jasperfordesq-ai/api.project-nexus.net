"use client";

import { ReactNode } from "react";
import { Breadcrumbs, BreadcrumbItem, BreadcrumbsProps } from "@heroui/react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItemData {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface GlassBreadcrumbsProps extends Omit<BreadcrumbsProps, "children"> {
  items: BreadcrumbItemData[];
  showHome?: boolean;
  separator?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function GlassBreadcrumbs({
  items,
  showHome = true,
  separator,
  size = "md",
  ...props
}: GlassBreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: "Home", href: "/", icon: <Home className="w-4 h-4" /> }, ...items]
    : items;

  return (
    <Breadcrumbs
      separator={separator || <ChevronRight className="w-4 h-4 text-white/30" />}
      size={size}
      classNames={{
        list: "gap-1",
        separator: "px-1",
      }}
      itemClasses={{
        item: "text-white/50 data-[current=true]:text-white",
        separator: "text-white/30",
      }}
      {...props}
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const content = (
          <span className="flex items-center gap-1.5">
            {item.icon}
            {item.label}
          </span>
        );

        return (
          <BreadcrumbItem
            key={index}
            isCurrent={isLast}
            className={`
              ${isLast ? "text-white font-medium" : "text-white/50 hover:text-white/70"}
              transition-colors
            `}
          >
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-white/70 transition-colors">
                {content}
              </Link>
            ) : (
              content
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumbs>
  );
}

export { Breadcrumbs, BreadcrumbItem };
