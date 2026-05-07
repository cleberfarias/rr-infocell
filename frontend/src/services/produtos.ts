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
  meta?: Record<string, unknown>;
};

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(
      payload?.error?.message ?? "Nao foi possivel concluir a operacao.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const listProdutos = async (
  filters: {
    query?: string;
    categoria?: ProdutoCategoria | "";
    ativo?: boolean | "";
  } = {},
) => {
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

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<Produto[]>>(
    `/produtos${suffix}`,
  );

  return response.data;
};

export const createProduto = async (input: ProdutoInput) => {
  const response = await request<ApiResponse<Produto>>("/produtos", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateProduto = async (id: string, input: ProdutoInput) => {
  const response = await request<ApiResponse<Produto>>(`/produtos/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteProduto = async (id: string) => {
  await request<void>(`/produtos/${id}`, {
    method: "DELETE",
  });
};
