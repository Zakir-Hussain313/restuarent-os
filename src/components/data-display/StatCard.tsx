import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  className?: string;
  accent?: "default" | "green" | "orange" | "red" | "blue";
}

const ACCENT_STYLES = {
  default: "bg-primary/10 text-primary",
  green: "bg-emerald-500/10 text-emerald-600",
  orange: "bg-orange-500/10 text-orange-600",
  red: "bg-red-500/10 text-red-600",
  blue: "bg-blue-500/10 text-blue-600",
};

export function StatCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon,
  isCurrency = false,
  prefix,
  suffix,
  loading = false,
  className,
  accent = "default",
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3.5 w-28" />
        </CardContent>
      </Card>
    );
  }

  const formattedValue =
    isCurrency && typeof value === "number"
      ? formatCurrency(value)
      : `${prefix ?? ""}${typeof value === "number" ? value.toLocaleString() : value}${suffix ?? ""}`;

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0 || change === undefined;

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", ACCENT_STYLES[accent])}>
              <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            </div>
          )}
        </div>

        <p className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
          {formattedValue}
        </p>

        {change !== undefined && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive && "text-emerald-600",
                isNegative && "text-red-500",
                isNeutral && "text-muted-foreground"
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {isNeutral && <Minus className="w-3 h-3" />}
              {isPositive && "+"}
              {change.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}