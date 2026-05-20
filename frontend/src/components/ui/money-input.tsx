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

// Converte o texto digitado para string numérica normalizada ("1121.01")
const toNumeric = (raw: string): string => {
  const cleaned = raw.replace(/[^\d,.]/g, "");

  // Vírgula presente → é o separador decimal; pontos são separadores de milhar
  if (cleaned.includes(",")) {
    return cleaned.replace(/\./g, "").replace(",", ".");
  }

  const parts = cleaned.split(".");
  if (parts.length === 1) return cleaned;

  // Múltiplos pontos: verifica se último segmento é decimal (≤2 dígitos)
  if (parts.length > 2) {
    const last = parts[parts.length - 1];
    return last.length <= 2
      ? parts.slice(0, -1).join("") + "." + last
      : parts.join("");
  }

  // Ponto único: "1.000" (3 dígitos) → milhar; "25.90" → decimal
  return parts[1].length === 3 ? parts.join("") : cleaned;
};

// Formata o valor numérico para exibição no modo não-focado ("R$ 1.121,01")
const toDisplay = (value: string): string => {
  const n = parseFloat(value);
  if (!value || isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte o valor numérico interno para texto de edição com vírgula ("1121,01")
const toEditing = (value: string): string => {
  const n = parseFloat(value);
  if (!value || isNaN(n)) return "";
  // Usa vírgula como decimal para manter padrão pt-BR durante a digitação
  return String(n).replace(".", ",");
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
  const [rawText, setRawText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const editValue = toEditing(value);
    setRawText(editValue);
    setFocused(true);
    setTimeout(() => e.target.select(), 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawText(raw);
    onChange(toNumeric(raw));
  };

  const handleBlur = () => {
    setFocused(false);
  };

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
        placeholder={placeholder}
        value={focused ? rawText : toDisplay(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        min={min}
      />
    </div>
  );
}
