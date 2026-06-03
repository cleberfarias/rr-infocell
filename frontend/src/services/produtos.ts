import { apiRequest } from "./api";
import { getTenantScopedPayload } from "@/lib/tenantPayload";
export type ProdutoCategoria =
  | "peca"
  | "produto"
  | "acessorio"
  | "servico"
  | "celular_novo"
  | "celular_seminovo"
  | "celular_restaurado";

export type ProdutoOrigem = "compra" | "troca" | "consignado";

export type Produto = {
  id: string;
  sku: string;
  nome: string;
  categoria: ProdutoCategoria;
  estoqueAtual: number;
  estoqueMinimo: number;
  custo: number;
  precoVenda: number;
  ativo: boolean;
  marca?: string;
  fornecedor?: string;
  codigoFornecedor?: string;
  modelo?: string;
  imei?: string;
  cor?: string;
  capacidade?: string;
  estadoConservacao?: string;
  saudeBateria?: number;
  origem?: ProdutoOrigem;
  garantiaDias?: number;
  laudoEntrada?: string;
  custoRestauracao?: number;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProdutoInput = {
  sku: string;
  nome: string;
  categoria: ProdutoCategoria;
  estoqueAtual: number;
  estoqueMinimo: number;
  custo: number;
  precoVenda: number;
  ativo?: boolean;
  marca?: string;
  fornecedor?: string;
  codigoFornecedor?: string;
  modelo?: string;
  imei?: string;
  cor?: string;
  capacidade?: string;
  estadoConservacao?: string;
  saudeBateria?: number;
  origem?: ProdutoOrigem;
  garantiaDias?: number;
  laudoEntrada?: string;
  custoRestauracao?: number;
  observacoes?: string;
};

type ApiResponse<T> = {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  } & Record<string, unknown>;
};

export const listProdutos = async (
  filters: {
    query?: string;
    categoria?: ProdutoCategoria | "";
    ativo?: boolean | "";
    page?: number;
    limit?: number;
  } = {},
) => {
  const buildSearch = (page: number) => {
    const search = new URLSearchParams();

    if (filters.query?.trim()) {
      search.set("q", filters.query.trim());
    }

    if (filters.categoria) {
      search.set("categoria", filters.categoria);
    }

    if (filters.ativo !== "" && filters.ativo !== undefined) {
      search.set("ativo", String(filters.ativo));
    }

    search.set("page", String(page));
    search.set("limit", String(filters.limit ?? 200));

    return search.toString();
  };

  const fetchPage = async (page: number) => {
    const suffix = buildSearch(page);
    return apiRequest<ApiResponse<Produto[]>>(`/produtos?${suffix}`);
  };

  const firstPage = filters.page ?? 1;
  const firstResponse = await fetchPage(firstPage);

  if (filters.page !== undefined) {
    return firstResponse.data;
  }

  const totalPages = Number(firstResponse.meta?.totalPages ?? 1);

  if (totalPages <= firstPage) {
    return firstResponse.data;
  }

  const remainingResponses = await Promise.all(
    Array.from(
      { length: totalPages - firstPage },
      (_, index) => firstPage + index + 1,
    ).map((page) => fetchPage(page)),
  );

  return [
    ...firstResponse.data,
    ...remainingResponses.flatMap((response) => response.data),
  ];
};

export const createProduto = async (input: ProdutoInput) => {
  const response = await apiRequest<ApiResponse<Produto>>("/produtos", {
    method: "POST",
    body: JSON.stringify(getTenantScopedPayload(input)),
  });

  return response.data;
};

export const updateProduto = async (id: string, input: ProdutoInput) => {
  const response = await apiRequest<ApiResponse<Produto>>(`/produtos/${id}`, {
    method: "PUT",
    body: JSON.stringify(getTenantScopedPayload(input)),
  });

  return response.data;
};

export const deleteProduto = async (id: string) => {
  await apiRequest<void>(`/produtos/${id}`, {
    method: "DELETE",
  });
};
