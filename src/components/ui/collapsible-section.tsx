"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ label, summary, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted transition-colors"
      >
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          {!isOpen && summary && (
            <span className="text-sm font-medium text-foreground truncate">{summary}</span>
          )}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && <div className="p-3 pt-2 border-t border-border">{children}</div>}
    </div>
  );
}