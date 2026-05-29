"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuSearch({ value, onChange, resultCount }: MenuSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in another input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680] pointer-events-none"
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            inputRef.current?.blur();
          }
        }}
        placeholder="Search menu… ( / )"
        className={cn(
          "w-full h-9 pl-9 pr-8 rounded-lg border text-sm transition-all",
          "bg-white border-[#ebe9e4] text-[#1a1815] placeholder:text-[#8a8680]",
          "focus:outline-none focus:ring-2 focus:ring-[#e8570e] focus:border-transparent",
          value && "pr-14"
        )}
      />

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {/* Result count */}
        {value && resultCount !== undefined && (
          <span className="text-xs text-[#8a8680] whitespace-nowrap">
            {resultCount}
          </span>
        )}

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="text-[#8a8680] hover:text-[#1a1815] transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}