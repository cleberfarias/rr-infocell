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

  return (await response.json()) as T;
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
  const response = await request<ApiResponse<MovimentacaoEstoque[]>>(
    `/movimentacoes-estoque${suffix}`,
  );

  return response.data;
};

export const createMovimentacaoEstoque = async (
  input: MovimentacaoEstoqueInput,
) => {
  const response = await request<ApiResponse<MovimentacaoEstoque>>(
    "/movimentacoes-estoque",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data;
};
