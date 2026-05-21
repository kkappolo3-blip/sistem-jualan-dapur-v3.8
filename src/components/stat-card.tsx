import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "accent";
  valueClassName?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
    accent: "bg-accent/30 text-primary",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className={cn("mt-1 truncate text-xl font-bold md:text-2xl", valueClassName)}>
            {value}
          </div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
