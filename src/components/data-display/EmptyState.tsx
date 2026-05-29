import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_STYLES = {
  sm: { wrapper: "py-8", icon: "w-8 h-8", title: "text-sm", description: "text-xs" },
  md: { wrapper: "py-12", icon: "w-10 h-10", title: "text-base", description: "text-sm" },
  lg: { wrapper: "py-20", icon: "w-12 h-12", title: "text-lg", description: "text-sm" },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.wrapper,
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl bg-muted mb-4",
            styles.icon
          )}
        >
          <span className="[&>svg]:w-5 [&>svg]:h-5 text-muted-foreground">{icon}</span>
        </div>
      )}
      <h3 className={cn("font-semibold text-foreground mb-1", styles.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-muted-foreground max-w-xs", styles.description)}>
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}