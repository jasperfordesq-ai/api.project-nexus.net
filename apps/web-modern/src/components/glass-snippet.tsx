"use client";

import { ReactNode, ReactElement, useState } from "react";
import { Snippet, SnippetProps, Code, CodeProps } from "@heroui/react";
import { Copy, Check } from "lucide-react";

export interface GlassSnippetProps {
  children: string;
  symbol?: string;
  copyIcon?: ReactElement;
  checkIcon?: ReactElement;
  hideCopyButton?: boolean;
  hideSymbol?: boolean;
  variant?: "flat" | "bordered" | "solid" | "shadow";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

export function GlassSnippet({
  children,
  symbol = "$",
  copyIcon,
  checkIcon,
  hideCopyButton = false,
  hideSymbol = false,
  variant = "flat",
  color = "default",
  size = "md",
  ...props
}: GlassSnippetProps) {
  return (
    <Snippet
      symbol={hideSymbol ? "" : symbol}
      hideCopyButton={hideCopyButton}
      copyIcon={copyIcon || <Copy className="w-4 h-4" />}
      checkIcon={checkIcon || <Check className="w-4 h-4" />}
      variant={variant}
      color={color}
      size={size}
      classNames={{
        base: "bg-white/5 backdrop-blur-xl border border-white/10",
        pre: "text-white/80 font-mono",
        symbol: "text-indigo-400",
        copyButton: "text-white/50 hover:text-white hover:bg-white/10",
        checkIcon: "text-emerald-400",
      }}
      {...props}
    >
      {children}
    </Snippet>
  );
}

// Multi-line code block
export interface GlassCodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  onCopy?: () => void;
}

export function GlassCodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightLines = [],
  onCopy,
}: GlassCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        {language && (
          <span className="text-xs text-white/50 uppercase tracking-wider">{language}</span>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Code */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono">
          {lines.map((line, index) => (
            <div
              key={index}
              className={`flex ${
                highlightLines.includes(index + 1)
                  ? "bg-indigo-500/10 -mx-4 px-4"
                  : ""
              }`}
            >
              {showLineNumbers && (
                <span className="select-none text-white/30 w-8 flex-shrink-0 text-right pr-4">
                  {index + 1}
                </span>
              )}
              <span className="text-white/80">{line || " "}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

// Inline code
export interface GlassCodeProps extends Omit<CodeProps, "classNames"> {
  children: string;
  size?: "sm" | "md" | "lg";
}

export function GlassCode({ children, size = "md", ...props }: GlassCodeProps) {
  return (
    <Code
      size={size}
      classNames={{
        base: "bg-white/10 text-indigo-300 px-1.5 py-0.5",
      }}
      {...props}
    >
      {children}
    </Code>
  );
}

export { Snippet, Code };
