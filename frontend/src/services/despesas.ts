export const despesaCategorias = [
  "aluguel",
  "agua",
  "luz",
  "internet",
  "telefone",
  "salarios",
  "marketing",
  "impostos",
  "outros",
] as const;

export type DespesaCategoria = (typeof despesaCategorias)[number];

export type Despesa = {
  id: string;
  descricao: string;
  categoria: DespesaCategoria;
  fornecedor?: string;
  valor: number;
  vencimento: string;
  recorrente: boolean;
  pago: boolean;
  pagoEm?: string;
  createdAt: string;
  updatedAt: string;
};

export type DespesaInput = {
  descricao: string;
  categoria: DespesaCategoria;
  fornecedor?: string;
  valor: number;
  vencimento: string;
  recorrente?: boolean;
  pago?: boolean;
};

export const categoriaLabels: Record<DespesaCategoria, string> = {
  aluguel: "Aluguel",
  agua: "Agua",
  luz: "Energia",
  internet: "Internet",
  telefone: "Telefone",
  salarios: "Salarios",
  marketing: "Marketing",
  impostos: "Impostos",
  outros: "Outros",
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

export const listDespesas = async (
  filters: {
    query?: string;
    categoria?: DespesaCategoria | "";
    pago?: boolean | "";
  } = {},
) => {
  const search = new URLSearchParams();

  if (filters.query?.trim()) {
    search.set("q", filters.query.trim());
  }

  if (filters.categoria) {
    search.set("categoria", filters.categoria);
  }

  if (filters.pago !== "" && filters.pago !== undefined) {
    search.set("pago", String(filters.pago));
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<Despesa[]>>(`/despesas${suffix}`);

  return response.data;
};

export const createDespesa = async (input: DespesaInput) => {
  const response = await request<ApiResponse<Despesa>>("/despesas", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateDespesa = async (id: string, input: DespesaInput) => {
  const response = await request<ApiResponse<Despesa>>(`/despesas/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteDespesa = async (id: string) => {
  await request<void>(`/despesas/${id}`, {
    method: "DELETE",
  });
};
