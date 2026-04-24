import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const PageHeader = ({ eyebrow, title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-2xl font-bold leading-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
