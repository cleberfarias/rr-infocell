import { apiRequest } from "./api";
import { getTenantScopedPayload } from "@/lib/tenantPayload";
export const ordemServicoStatus = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
  "entregue",
  "sem_conserto",
  "cancelado",
] as const;

export type OrdemServicoStatus = (typeof ordemServicoStatus)[number];

export type OrdemServicoFormaPagamento =
  | "pix"
  | "cartao"
  | "dinheiro"
  | "terceirizado";
export type OrdemServicoPrioridade = "baixa" | "normal" | "urgente";
export type OrdemServicoCanalAprovacao = "balcao" | "whatsapp" | "telefone";

export type TipoSenhaAparelho =
  | "sem_senha"
  | "numerica"
  | "padrao"
  | "nao_informou";

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
  createdAt: string;
  updatedAt: string;
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
  quantidade: number;
  valorUnitario?: number;
};

type ApiResponse<T> = {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    query?: string;
    status?: string;
    prioridade?: string;
    clienteId?: string;
    aparelhoId?: string;
  };
};

export const listOrdensServico = async (
  filters: {
    query?: string;
    status?: OrdemServicoStatus | "";
    prioridade?: OrdemServicoPrioridade | "";
    clienteId?: string;
    aparelhoId?: string;
  } = {},
) => {
  const limit = 200;
  const ordens: OrdemServico[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetchOrdensServicoPage(filters, page, limit);
    ordens.push(...response.data);
    totalPages = Number(response.meta?.totalPages ?? 1);
    page += 1;
  } while (page <= totalPages);

  return ordens;
};

const fetchOrdensServicoPage = async (
  filters: {
    query?: string;
    status?: OrdemServicoStatus | "";
    prioridade?: OrdemServicoPrioridade | "";
    clienteId?: string;
    aparelhoId?: string;
  },
  page: number,
  limit: number,
) => {
  const search = new URLSearchParams();

  if (filters.query?.trim()) {
    search.set("q", filters.query.trim());
  }

  if (filters.status) {
    search.set("status", filters.status);
  }

  if (filters.prioridade) {
    search.set("prioridade", filters.prioridade);
  }

  if (filters.clienteId?.trim()) {
    search.set("clienteId", filters.clienteId.trim());
  }

  if (filters.aparelhoId?.trim()) {
    search.set("aparelhoId", filters.aparelhoId.trim());
  }

  search.set("page", String(page));
  search.set("limit", String(limit));

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<ApiResponse<OrdemServico[]>>(`/ordens-servico${suffix}`);
};

export const getOrdemServico = async (id: string) => {
  const response = await apiRequest<ApiResponse<OrdemServico>>(
    `/ordens-servico/${id}`,
  );

  return response.data;
};

export const createOrdemServico = async (input: OrdemServicoInput) => {
  const response = await apiRequest<ApiResponse<OrdemServico>>(
    "/ordens-servico",
    {
      method: "POST",
      body: JSON.stringify(getTenantScopedPayload(input)),
    },
  );

  return response.data;
};

export const updateOrdemServico = async (
  id: string,
  input: OrdemServicoInput,
) => {
  const response = await apiRequest<ApiResponse<OrdemServico>>(
    `/ordens-servico/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(getTenantScopedPayload(input)),
    },
  );

  return response.data;
};

export const deleteOrdemServico = async (id: string) => {
  await apiRequest<void>(`/ordens-servico/${id}`, {
    method: "DELETE",
  });
};
