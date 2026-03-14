// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import { Globe } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

/** Flag emoji map for supported language codes */
const FLAG_MAP: Record<string, string> = {
  en: "\uD83C\uDDEC\uD83C\uDDE7",
  ga: "\uD83C\uDDEE\uD83C\uDDEA",
  fr: "\uD83C\uDDEB\uD83C\uDDF7",
  es: "\uD83C\uDDEA\uD83C\uDDF8",
  de: "\uD83C\uDDE9\uD83C\uDDEA",
  pl: "\uD83C\uDDF5\uD83C\uDDF1",
  pt: "\uD83C\uDDF5\uD83C\uDDF9",
};

/** Fallback language list when API hasn't responded yet */
const FALLBACK_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ga", name: "Irish" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
];

export function LanguageSwitcher() {
  const { locale, languages, setLocale, isLoading } = useI18n();

  const items = languages.length > 0 ? languages : FALLBACK_LANGUAGES;

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="text-white/70 hover:text-white min-w-8 w-8 h-8"
          aria-label="Change language"
          isLoading={isLoading}
        >
          {FLAG_MAP[locale] ? (
            <span className="text-sm">{FLAG_MAP[locale]}</span>
          ) : (
            <Globe className="w-4 h-4" />
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Select language"
        className="bg-black/90 backdrop-blur-xl border border-white/10 min-w-[180px]"
        selectionMode="single"
        selectedKeys={new Set([locale])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          if (selected && selected !== locale) {
            setLocale(selected);
          }
        }}
      >
        {items.map((lang) => (
          <DropdownItem
            key={lang.code}
            className="text-white/80 hover:text-white"
            startContent={
              <span className="text-sm w-6 text-center">
                {FLAG_MAP[lang.code] || lang.code.toUpperCase()}
              </span>
            }
          >
            {lang.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
