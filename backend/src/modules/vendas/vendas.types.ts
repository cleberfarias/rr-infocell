import type { OrdemServicoFormaPagamento } from "../ordens-servico/ordens-servico.types.js";

export type VendaStatus = "finalizada" | "cancelada";

export type Venda = {
  id: string;
  ordemServicoId: string;
  numeroOs: number;
  clienteId: string;
  aparelhoId: string;
  valorPecas: number;
  valorMaoObra: number;
  valorTotal: number;
  formaPagamento: OrdemServicoFormaPagamento;
  valorRecebido: number;
  troco: number;
  status: VendaStatus;
  createdAt: string;
};

export type VendaInput = {
  ordemServicoId: string;
  formaPagamento: OrdemServicoFormaPagamento;
  valorRecebido: number;
};
