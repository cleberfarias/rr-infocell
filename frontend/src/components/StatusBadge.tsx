import { cn } from "@/lib/utils";

type StatusKey =
  | "recebido"
  | "em_analise"
  | "aguardando_aprovacao"
  | "aguardando_peca"
  | "em_manutencao"
  | "pronto_para_retirada"
  | "finalizado"
  | "entregue"
  | "sem_conserto"
  | "cancelado"
  | "atrasado"
  | "aprovado"
  | "reprovado"
  | "pago"
  | "pendente";

const map: Record<StatusKey, { label: string; className: string; pulse?: boolean }> = {
  recebido: {
    label: "Recebido",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  },
  em_analise: {
    label: "Em análise",
    className: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  },
  aguardando_aprovacao: {
    label: "Aguardando aprovação",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    pulse: true,
  },
  aguardando_peca: {
    label: "Aguardando peça",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    pulse: true,
  },
  em_manutencao: {
    label: "Em manutenção",
    className: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  },
  pronto_para_retirada: {
    label: "Pronto para retirada",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
    pulse: true,
  },
  finalizado: {
    label: "Finalizado",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  entregue: {
    label: "Entregue",
    className: "bg-emerald-500/20 text-emerald-700 border-emerald-600/40",
  },
  sem_conserto: {
    label: "Sem conserto",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  atrasado: {
    label: "Atrasado",
    className: "bg-red-500/15 text-red-600 border-red-500/40",
    pulse: true,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  reprovado: {
    label: "Reprovado",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  pago: {
    label: "Pago",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  pendente: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
};

export const StatusBadge = ({
  status,
  className,
}: {
  status: StatusKey;
  className?: string;
}) => {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide",
        s.className,
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current opacity-80",
          s.pulse && "animate-pulse",
        )}
      />
      {s.label}
    </span>
  );
};

export type { StatusKey };
