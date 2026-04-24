import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  accentClassName?: string;
};

export const MetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  accentClassName,
}: MetricCardProps) => (
  <Card className="surface-panel relative overflow-hidden p-5">
    <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-glow opacity-60" />
    <div className="relative flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-primary",
          accentClassName,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {trend && (
      <p className="relative mt-3 inline-flex items-center gap-1 font-mono text-xs text-success">
        <TrendingUp className="h-3 w-3" /> {trend}
      </p>
    )}
  </Card>
);
