export const ordemServicoStatus = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
  "entregue",
  "cancelado",
] as const;

export type OrdemServicoStatus = (typeof ordemServicoStatus)[number];

export type OrdemServico = {
  id: string;
  numero: number;
  clienteId: string;
  aparelhoId: string;
  checklistId?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  status: OrdemServicoStatus;
  tecnicoResponsavel?: string;
  valorPecas: number;
  valorMaoObra: number;
  valorTotal: number;
  entradaEm: string;
  previsaoEntregaEm?: string;
  concluidaEm?: string;
  entregueEm?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrdemServicoInput = {
  clienteId: string;
  aparelhoId: string;
  checklistId?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  status?: OrdemServicoStatus;
  tecnicoResponsavel?: string;
  valorPecas?: number;
  valorMaoObra?: number;
  entradaEm?: string;
  previsaoEntregaEm?: string;
};
