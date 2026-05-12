import { apiRequest } from "./api";
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
  aprovadoPor?: string;
  canalAprovacao?: "balcao" | "whatsapp" | "telefone";
  mensagemAprovacao?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrcamentoInput = {
  ordemServicoId: string;
  status?: OrcamentoStatus;
  aprovadoPor?: string;
  canalAprovacao?: "balcao" | "whatsapp" | "telefone";
  mensagemAprovacao?: string;
  observacoes?: string;
};

type ApiResponse<T> = {
  data: T;
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
  const response = await apiRequest<ApiResponse<Orcamento[]>>(
    `/orcamentos${suffix}`,
  );

  return response.data;
};

export const createOrcamento = async (input: OrcamentoInput) => {
  const response = await apiRequest<ApiResponse<Orcamento>>("/orcamentos", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};
