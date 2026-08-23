"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />

      <Input
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
        className={cn("h-11 min-[760px]:h-9 text-base min-[760px]:text-sm pl-9 pr-8", value && "pr-14")}
      />

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {/* Result count */}
        {value && resultCount !== undefined && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
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
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}