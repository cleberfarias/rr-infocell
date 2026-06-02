import { apiRequest } from "./api";
import { getTenantScopedPayload } from "@/lib/tenantPayload";
export type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  receberMensagemAutomatica?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClienteInput = {
  nome: string;
  telefone?: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  receberMensagemAutomatica?: boolean;
};

type ApiResponse<T> = {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    query?: string;
  };
};

export const listClientes = async (query = "") => {
  const limit = 200;
  const clientes: Cliente[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetchClientesPage(query, page, limit);
    clientes.push(...response.data);
    totalPages = Number(response.meta?.totalPages ?? 1);
    page += 1;
  } while (page <= totalPages);

  return clientes;
};

const fetchClientesPage = async (query: string, page: number, limit: number) => {
  const search = new URLSearchParams();

  if (query.trim()) {
    search.set("q", query.trim());
  }

  search.set("page", String(page));
  search.set("limit", String(limit));

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<ApiResponse<Cliente[]>>(`/clientes${suffix}`);
};

export const getCliente = async (id: string) => {
  const response = await apiRequest<ApiResponse<Cliente>>(`/clientes/${id}`);

  return response.data;
};

export const createCliente = async (input: ClienteInput) => {
  const response = await apiRequest<ApiResponse<Cliente>>("/clientes", {
    method: "POST",
    body: JSON.stringify(getTenantScopedPayload(input)),
  });

  return response.data;
};

export const updateCliente = async (id: string, input: ClienteInput) => {
  const response = await apiRequest<ApiResponse<Cliente>>(`/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(getTenantScopedPayload(input)),
  });

  return response.data;
};

export const deleteCliente = async (id: string) => {
  await apiRequest<void>(`/clientes/${id}`, {
    method: "DELETE",
  });
};
