export type OrdemEventoTipo =
  | "comentario"
  | "diagnostico"
  | "status"
  | "orcamento"
  | "venda"
  | "checklist"
  | "peca"
  | "garantia"
  | "entrega";

export type OrdemEvento = {
  id: string;
  ordemServicoId: string;
  tipo: OrdemEventoTipo;
  titulo: string;
  descricao?: string;
  criadoPor?: string;
  createdAt: string;
};

export type OrdemEventoInput = {
  ordemServicoId: string;
  tipo?: OrdemEventoTipo;
  titulo: string;
  descricao?: string;
  criadoPor?: string;
};

type ApiResponse<T> = {
  data: T;
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
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    throw new Error(
      payload?.error?.message ?? "Nao foi possivel concluir a operacao.",
    );
  }

  return (await response.json()) as T;
};

export const listOrdemEventos = async (
  filters: {
    ordemServicoId?: string;
    tipo?: OrdemEventoTipo | "";
  } = {},
) => {
  const search = new URLSearchParams();

  if (filters.ordemServicoId?.trim()) {
    search.set("ordemServicoId", filters.ordemServicoId.trim());
  }

  if (filters.tipo) {
    search.set("tipo", filters.tipo);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<OrdemEvento[]>>(
    `/ordem-eventos${suffix}`,
  );

  return response.data;
};

export const createOrdemEvento = async (input: OrdemEventoInput) => {
  const response = await request<ApiResponse<OrdemEvento>>("/ordem-eventos", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};
