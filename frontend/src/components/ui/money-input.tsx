import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
}

const toNumeric = (raw: string) =>
  raw.replace(/[^\d,]/g, "").replace(",", ".");

const toDisplay = (value: string): string => {
  const n = parseFloat(value.replace(",", "."));
  if (!value || isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0,00",
  disabled,
  className,
  min = 0,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      {!focused && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none font-mono text-sm text-muted-foreground">
          R$
        </span>
      )}
      <Input
        ref={ref}
        id={id}
        disabled={disabled}
        type="text"
        inputMode="decimal"
        className={cn("font-mono", !focused && "pl-9", className)}
        placeholder={focused ? placeholder : placeholder}
        value={focused ? value : toDisplay(value)}
        onChange={(e) => onChange(toNumeric(e.target.value))}
        onFocus={(e) => {
          setFocused(true);
          setTimeout(() => e.target.select(), 0);
        }}
        onBlur={() => setFocused(false)}
        min={min}
      />
    </div>
  );
}
