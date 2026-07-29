import type { OrdemServicoFormaPagamento } from "../ordens-servico/ordens-servico.types.js";

export type VendaStatus = "finalizada" | "cancelada";
export type VendaTipo = "ordem_servico" | "direta";

export type VendaItem = {
  produtoId: string;
  sku: string;
  nome: string;
  categoria?: string;
  imei?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  garantiaDias?: number;
  garantiaAte?: string;
};

export type Venda = {
  id: string;
  tipo: VendaTipo;
  ordemServicoId?: string;
  numeroOs?: number;
  clienteId?: string;
  clienteNome?: string;
  aparelhoId?: string;
  itens: VendaItem[];
  valorPecas: number;
  valorMaoObra: number;
  desconto?: number;
  valorTotal: number;
  formaPagamento: OrdemServicoFormaPagamento;
  valorRecebido: number;
  troco: number;
  status: VendaStatus;
  tenantId?: string;
  createdAt: string;
};

export type VendaInput = {
  paymentTransactionId?: string;
  ordemServicoId?: string;
  clienteId?: string;
  clienteNome?: string;
  itens?: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario?: number;
    garantiaDias?: number;
  }>;
  formaPagamento: OrdemServicoFormaPagamento;
  valorRecebido: number;
  desconto?: number;
};
