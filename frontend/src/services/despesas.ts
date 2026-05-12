import { apiRequest } from "./api";
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
  const response = await apiRequest<ApiResponse<Despesa[]>>(
    `/despesas${suffix}`,
  );

  return response.data;
};

export const createDespesa = async (input: DespesaInput) => {
  const response = await apiRequest<ApiResponse<Despesa>>("/despesas", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateDespesa = async (id: string, input: DespesaInput) => {
  const response = await apiRequest<ApiResponse<Despesa>>(`/despesas/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteDespesa = async (id: string) => {
  await apiRequest<void>(`/despesas/${id}`, {
    method: "DELETE",
  });
};
