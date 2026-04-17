import { cn } from "@/lib/utils";

type StatusKey =
  | "recebido"
  | "em_analise"
  | "aguardando_aprovacao"
  | "em_manutencao"
  | "finalizado"
  | "entregue"
  | "atrasado"
  | "aprovado"
  | "reprovado"
  | "pago"
  | "pendente";

const map: Record<StatusKey, { label: string; className: string }> = {
  recebido:             { label: "Recebido",              className: "bg-muted text-muted-foreground border-border" },
  em_analise:           { label: "Em análise",            className: "bg-info/10 text-info border-info/30" },
  aguardando_aprovacao: { label: "Aguardando aprovação",  className: "bg-warning/10 text-warning border-warning/30" },
  em_manutencao:        { label: "Em manutenção",         className: "bg-primary/10 text-primary border-primary/30" },
  finalizado:           { label: "Finalizado",            className: "bg-success/10 text-success border-success/30" },
  entregue:             { label: "Entregue",              className: "bg-success/15 text-success border-success/40" },
  atrasado:             { label: "Atrasado",              className: "bg-destructive/10 text-destructive border-destructive/30" },
  aprovado:             { label: "Aprovado",              className: "bg-success/10 text-success border-success/30" },
  reprovado:            { label: "Reprovado",             className: "bg-destructive/10 text-destructive border-destructive/30" },
  pago:                 { label: "Pago",                  className: "bg-success/10 text-success border-success/30" },
  pendente:             { label: "Pendente",              className: "bg-warning/10 text-warning border-warning/30" },
};

export const StatusBadge = ({ status, className }: { status: StatusKey; className?: string }) => {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium font-mono uppercase tracking-wide",
        s.className,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {s.label}
    </span>
  );
};

export type { StatusKey };
