import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-start justify-between px-6 py-5 border-b border-[#ebe9e4] bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#1a1814] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[#8a8680] mt-0.5">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 ml-4 shrink-0">{actions}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#f9f8f6]">
        {children}
      </div>
    </div>
  );
}