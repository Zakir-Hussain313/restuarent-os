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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 border-b border-border bg-card shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-heading font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-4 shrink-0">{actions}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
        {children}
      </div>
    </div>
  );
}