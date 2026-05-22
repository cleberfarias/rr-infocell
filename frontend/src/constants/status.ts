import type { OrdemServicoStatus } from "@/services/ordens-servico";

export const OS_STATUS_LABELS: Record<OrdemServicoStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_peca: "Aguardando peça",
  em_manutencao: "Em manutenção",
  pronto_para_retirada: "Pronto para retirada",
  entregue: "Entregue",
  sem_conserto: "Sem conserto",
  cancelado: "Cancelado",
};

export const OS_STATUS_OPTIONS: Array<{ value: OrdemServicoStatus | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "recebido", label: "Recebido" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "aguardando_peca", label: "Aguardando peça" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "pronto_para_retirada", label: "Pronto para retirada" },
  { value: "entregue", label: "Entregue" },
  { value: "sem_conserto", label: "Sem conserto" },
  { value: "cancelado", label: "Cancelado" },
];

export const CHECKLIST_STATUS_LABELS = {
  funcionando: "Funcionando",
  com_defeito: "Com defeito",
  nao_testado: "Não testado",
} as const;

export const MOVIMENTACAO_TIPO_LABELS = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste de Inventário",
  transferencia: "Transferência",
} as const;
