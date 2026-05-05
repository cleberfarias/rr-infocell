import type { OrdemServicoPeca } from "../ordens-servico/ordens-servico.types.js";

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
