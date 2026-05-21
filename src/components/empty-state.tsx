import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
