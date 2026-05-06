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

export type OrdemServicoFormaPagamento = "pix" | "cartao" | "dinheiro";

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
  pecasUsadas: OrdemServicoPeca[];
  valorPecas: number;
  valorMaoObra: number;
  valorTotal: number;
  entradaEm: string;
  previsaoEntregaEm?: string;
  concluidaEm?: string;
  entregueEm?: string;
  formaPagamento?: OrdemServicoFormaPagamento;
  valorRecebido?: number;
  troco?: number;
  pagoEm?: string;
  automacoes?: OrdemServicoAutomacoes;
  createdAt: string;
  updatedAt: string;
};

export type OrdemServicoAutomacoes = {
  aberturaEnviadaEm?: string;
  statusNotificados?: Partial<Record<OrdemServicoStatus, string>>;
  lembreteOrcamentoEnviadoEm?: string;
  lembreteRetiradaEnviadoEm?: string;
};

export type OrdemServicoPeca = {
  produtoId: string;
  sku: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type OrdemServicoInput = {
  clienteId: string;
  aparelhoId: string;
  checklistId?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  status?: OrdemServicoStatus;
  tecnicoResponsavel?: string;
  pecasUsadas?: OrdemServicoPecaInput[];
  valorPecas?: number;
  valorMaoObra?: number;
  entradaEm?: string;
  previsaoEntregaEm?: string;
  formaPagamento?: OrdemServicoFormaPagamento;
  valorRecebido?: number;
};

export type OrdemServicoPecaInput = {
  produtoId: string;
  sku?: string;
  nome?: string;
  quantidade: number;
  valorUnitario?: number;
};
