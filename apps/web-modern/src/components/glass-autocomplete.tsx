"use client";

import { ReactNode, Key } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  AutocompleteProps,
} from "@heroui/react";
import { Search } from "lucide-react";

export interface AutocompleteOption {
  key: string;
  label: string;
  description?: string;
  startContent?: ReactNode;
  endContent?: ReactNode;
}

export interface GlassAutocompleteProps extends Omit<AutocompleteProps, "children"> {
  options: AutocompleteOption[];
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  showSearchIcon?: boolean;
  emptyContent?: ReactNode;
  onSelectionChange?: (key: Key | null) => void;
}

export function GlassAutocomplete({
  options,
  label,
  placeholder = "Search...",
  isRequired = false,
  isDisabled = false,
  isLoading = false,
  showSearchIcon = true,
  emptyContent = "No results found",
  onSelectionChange,
  ...props
}: GlassAutocompleteProps) {
  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isLoading={isLoading}
      startContent={showSearchIcon ? <Search className="w-4 h-4 text-white/40" /> : undefined}
      onSelectionChange={onSelectionChange}
      listboxProps={{
        emptyContent: emptyContent,
      }}
      classNames={{
        base: "w-full",
        listboxWrapper: "bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl",
        listbox: "p-0",
        popoverContent: "bg-transparent border-0 shadow-none",
      }}
      inputProps={{
        classNames: {
          label: "text-white/70",
          input: "text-white placeholder:text-white/30",
          inputWrapper: [
            "bg-white/5",
            "border border-white/10",
            "hover:bg-white/10",
            "group-data-[focus=true]:bg-white/10",
            "group-data-[focus=true]:border-indigo-500/50",
          ],
        },
      }}
      {...props}
    >
      {options.map((option) => (
        <AutocompleteItem
          key={option.key}
          textValue={option.label}
          startContent={option.startContent}
          endContent={option.endContent}
          classNames={{
            base: "text-white/80 data-[hover=true]:bg-white/5 data-[selected=true]:bg-indigo-500/20",
            title: "text-white/80",
            description: "text-white/50",
          }}
        >
          <div>
            <p className="text-white/80">{option.label}</p>
            {option.description && (
              <p className="text-xs text-white/50">{option.description}</p>
            )}
          </div>
        </AutocompleteItem>
      ))}
    </Autocomplete>
  );
}

// User search autocomplete
export interface UserOption {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
}

export interface GlassUserSearchProps {
  users: UserOption[];
  label?: string;
  placeholder?: string;
  isLoading?: boolean;
  onSelect?: (userId: number | null) => void;
}

export function GlassUserSearch({
  users,
  label = "Search users",
  placeholder = "Type to search...",
  isLoading = false,
  onSelect,
}: GlassUserSearchProps) {
  return (
    <GlassAutocomplete
      label={label}
      placeholder={placeholder}
      isLoading={isLoading}
      options={users.map((user) => ({
        key: String(user.id),
        label: user.name,
        description: user.email,
        startContent: user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
        ),
      }))}
      onSelectionChange={(key) => onSelect?.(key ? Number(key) : null)}
    />
  );
}

export { Autocomplete, AutocompleteItem };
