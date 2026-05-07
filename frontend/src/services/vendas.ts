import type { OrdemServicoFormaPagamento } from "./ordens-servico";

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
  const response = await request<ApiResponse<Venda[]>>(`/vendas${suffix}`);

  return response.data;
};

export const createVenda = async (input: VendaInput) => {
  const response = await request<ApiResponse<Venda>>("/vendas", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};
