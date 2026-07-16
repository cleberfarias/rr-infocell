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
  recorrenciaOrigemId?: string;
  recorrenciaIndice?: number;
  tenantId?: string;
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
  recorrenciaOrigemId?: string;
  recorrenciaIndice?: number;
};
