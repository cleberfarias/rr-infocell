import type { OrdemServicoPeca } from "./ordens-servico";

export type OrcamentoStatus = "rascunho" | "enviado" | "aprovado" | "reprovado";

export type Orcamento = {
  id: string;
  ordemServicoId: string;
  numeroOs: number;
  clienteId: string;
  aparelhoId: string;
  status: OrcamentoStatus;
  diagnostico?: string;
  pecas: OrdemServicoPeca[];
  valorPecas: number;
  valorMaoObra: number;
  valorTotal: number;
  enviadoEm?: string;
  decididoEm?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrcamentoInput = {
  ordemServicoId: string;
  status?: OrcamentoStatus;
  observacoes?: string;
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

export const listOrcamentos = async (
  filters: {
    ordemServicoId?: string;
    status?: OrcamentoStatus | "";
  } = {},
) => {
  const search = new URLSearchParams();

  if (filters.ordemServicoId?.trim()) {
    search.set("ordemServicoId", filters.ordemServicoId.trim());
  }

  if (filters.status) {
    search.set("status", filters.status);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<Orcamento[]>>(`/orcamentos${suffix}`);

  return response.data;
};

export const createOrcamento = async (input: OrcamentoInput) => {
  const response = await request<ApiResponse<Orcamento>>("/orcamentos", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};
