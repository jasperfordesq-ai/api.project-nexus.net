"use client";

import { ReactNode } from "react";
import { Kbd, KbdProps } from "@heroui/react";

export interface GlassKbdProps extends Omit<KbdProps, "classNames"> {
  children: ReactNode;
  keys?: (
    | "command"
    | "shift"
    | "ctrl"
    | "option"
    | "enter"
    | "delete"
    | "escape"
    | "tab"
    | "capslock"
    | "up"
    | "right"
    | "down"
    | "left"
    | "pageup"
    | "pagedown"
    | "home"
    | "end"
    | "help"
    | "space"
  )[];
}

export function GlassKbd({ children, keys, ...props }: GlassKbdProps) {
  return (
    <Kbd
      keys={keys}
      classNames={{
        base: "bg-white/10 border border-white/20 shadow-sm",
        abbr: "text-white/80",
        content: "text-white/80",
      }}
      {...props}
    >
      {children}
    </Kbd>
  );
}

// Keyboard shortcut display
export interface KeyboardShortcutProps {
  keys: string[];
  description?: string;
}

export function KeyboardShortcut({ keys, description }: KeyboardShortcutProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <GlassKbd>{key}</GlassKbd>
            {index < keys.length - 1 && <span className="text-white/30 mx-1">+</span>}
          </span>
        ))}
      </div>
      {description && <span className="text-white/50 text-sm">{description}</span>}
    </div>
  );
}

// Shortcuts list
export interface ShortcutItem {
  keys: string[];
  description: string;
}

export interface ShortcutsListProps {
  shortcuts: ShortcutItem[];
  title?: string;
}

export function ShortcutsList({ shortcuts, title }: ShortcutsListProps) {
  return (
    <div className="space-y-3">
      {title && <h4 className="text-white/70 font-medium mb-4">{title}</h4>}
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-white/70 text-sm">{shortcut.description}</span>
          <div className="flex items-center gap-1">
            {shortcut.keys.map((key, keyIndex) => (
              <span key={keyIndex} className="flex items-center">
                <GlassKbd>{key}</GlassKbd>
                {keyIndex < shortcut.keys.length - 1 && (
                  <span className="text-white/30 mx-1">+</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Kbd };
