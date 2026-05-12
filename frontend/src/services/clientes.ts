import { apiRequest } from "./api";
export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClienteInput = {
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
};

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export const listClientes = async (query: string) => {
  const search = new URLSearchParams();

  if (query.trim()) {
    search.set("q", query.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiRequest<ApiResponse<Cliente[]>>(
    `/clientes${suffix}`,
  );

  return response.data;
};

export const getCliente = async (id: string) => {
  const response = await apiRequest<ApiResponse<Cliente>>(`/clientes/${id}`);

  return response.data;
};

export const createCliente = async (input: ClienteInput) => {
  const response = await apiRequest<ApiResponse<Cliente>>("/clientes", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateCliente = async (id: string, input: ClienteInput) => {
  const response = await apiRequest<ApiResponse<Cliente>>(`/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteCliente = async (id: string) => {
  await apiRequest<void>(`/clientes/${id}`, {
    method: "DELETE",
  });
};
