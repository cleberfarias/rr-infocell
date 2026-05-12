import { apiRequest } from "./api";
export type MovimentacaoEstoqueTipo = "entrada" | "saida" | "ajuste";

export type MovimentacaoEstoqueOrigem = "manual" | "ordem_servico";

export type MovimentacaoEstoque = {
  id: string;
  produtoId: string;
  produtoNome: string;
  produtoSku: string;
  tipo: MovimentacaoEstoqueTipo;
  quantidade: number;
  estoqueAnterior: number;
  estoquePosterior: number;
  motivo?: string;
  origem: MovimentacaoEstoqueOrigem;
  ordemServicoId?: string;
  criadoPor?: string;
  createdAt: string;
};

export type MovimentacaoEstoqueInput =
  | {
      produtoId: string;
      tipo: "entrada" | "saida";
      quantidade: number;
      motivo?: string;
    }
  | {
      produtoId: string;
      tipo: "ajuste";
      estoqueFinal: number;
      motivo?: string;
    };

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export const listMovimentacoesEstoque = async (
  filters: {
    produtoId?: string;
    tipo?: MovimentacaoEstoqueTipo | "";
  } = {},
) => {
  const search = new URLSearchParams();

  if (filters.produtoId) {
    search.set("produtoId", filters.produtoId);
  }

  if (filters.tipo) {
    search.set("tipo", filters.tipo);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiRequest<ApiResponse<MovimentacaoEstoque[]>>(
    `/movimentacoes-estoque${suffix}`,
  );

  return response.data;
};

export const createMovimentacaoEstoque = async (
  input: MovimentacaoEstoqueInput,
) => {
  const response = await apiRequest<ApiResponse<MovimentacaoEstoque>>(
    "/movimentacoes-estoque",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data;
};
