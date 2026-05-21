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

export type OrdemServicoFormaPagamento = "pix" | "cartao" | "dinheiro" | "terceirizado";
export type OrdemServicoPrioridade = "baixa" | "normal" | "urgente";
export type OrdemServicoCanalAprovacao = "balcao" | "whatsapp" | "telefone";

export type TipoSenhaAparelho = "sem_senha" | "numerica" | "padrao" | "nao_informou";

export type OrdemServico = {
  id: string;
  numero: number;
  clienteId: string;
  aparelhoId: string;
  checklistId?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  tipoSenha?: TipoSenhaAparelho;
  senhaAparelho?: string;
  padraoDeSenha?: string;
  status: OrdemServicoStatus;
  prioridade: OrdemServicoPrioridade;
  tecnicoResponsavel?: string;
  pecasUsadas: OrdemServicoPeca[];
  valorPecas: number;
  valorMaoObra: number;
  maoObraInclusaNaPeca?: boolean;
  desconto?: number;
  valorTotal: number;
  entradaEm: string;
  previsaoEntregaEm?: string;
  prazoPrometidoEm?: string;
  garantiaDias?: number;
  garantiaAte?: string;
  garantiaObservacoes?: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  canalAprovacao?: OrdemServicoCanalAprovacao;
  mensagemAprovacao?: string;
  concluidaEm?: string;
  entregueEm?: string;
  valorAdiantado?: number;
  formaPagamentoAdiantamento?: OrdemServicoFormaPagamento;
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
  tipoSenha?: TipoSenhaAparelho;
  senhaAparelho?: string;
  padraoDeSenha?: string;
  status?: OrdemServicoStatus;
  prioridade?: OrdemServicoPrioridade;
  tecnicoResponsavel?: string;
  pecasUsadas?: OrdemServicoPecaInput[];
  valorPecas?: number;
  valorMaoObra?: number;
  maoObraInclusaNaPeca?: boolean;
  desconto?: number;
  entradaEm?: string;
  previsaoEntregaEm?: string;
  prazoPrometidoEm?: string;
  garantiaDias?: number;
  garantiaObservacoes?: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  canalAprovacao?: OrdemServicoCanalAprovacao;
  mensagemAprovacao?: string;
  valorAdiantado?: number;
  formaPagamentoAdiantamento?: OrdemServicoFormaPagamento;
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
