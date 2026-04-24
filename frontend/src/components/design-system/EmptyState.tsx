import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center",
      className,
    )}
  >
    {Icon && (
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary/50 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
    )}
    <div className="max-w-md space-y-1">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div>}
  </div>
);
