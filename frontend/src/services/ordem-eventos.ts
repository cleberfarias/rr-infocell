import { apiRequest } from "./api";
import { getTenantScopedPayload } from "@/lib/tenantPayload";
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
  const response = await apiRequest<ApiResponse<OrdemEvento[]>>(
    `/ordem-eventos${suffix}`,
  );

  return response.data;
};

export const createOrdemEvento = async (input: OrdemEventoInput) => {
  const response = await apiRequest<ApiResponse<OrdemEvento>>(
    "/ordem-eventos",
    {
      method: "POST",
      body: JSON.stringify(getTenantScopedPayload(input)),
    },
  );

  return response.data;
};
