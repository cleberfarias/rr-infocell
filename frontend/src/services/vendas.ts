import { apiRequest } from "./api";
import type { OrdemServicoFormaPagamento } from "./ordens-servico";
import { getTenantScopedPayload } from "@/lib/tenantPayload";

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
  createdAt: string;
};

export type VendaInput = {
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

type ApiResponse<T> = {
  data: T;
};

export const listVendas = async (
  filters: {
    ordemServicoId?: string;
    status?: VendaStatus | "";
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
  const response = await apiRequest<ApiResponse<Venda[]>>(`/vendas${suffix}`);

  return response.data;
};

export const createVenda = async (input: VendaInput) => {
  const response = await apiRequest<ApiResponse<Venda>>("/vendas", {
    method: "POST",
    body: JSON.stringify(getTenantScopedPayload(input)),
  });

  return response.data;
};
