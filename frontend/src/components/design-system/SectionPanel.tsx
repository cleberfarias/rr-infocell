import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionPanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export const SectionPanel = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionPanelProps) => (
  <Card className={cn("surface-panel overflow-hidden p-0", className)}>
    {(title || description || actions) && (
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          {title && <h3 className="font-display text-base font-semibold">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    )}
    <div className={cn("p-5", contentClassName)}>{children}</div>
  </Card>
);
