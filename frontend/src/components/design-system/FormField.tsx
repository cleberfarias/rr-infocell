import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export const FormField = ({ id, label, hint, error, children, className }: FormFieldProps) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
    )}
    {children}
    {(hint || error) && (
      <p className={cn("text-xs text-muted-foreground", error && "text-destructive")}>
        {error ?? hint}
      </p>
    )}
  </div>
);
