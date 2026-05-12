import { apiRequest } from "./api";
export type Aparelho = {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  cor?: string;
  imeiSerial?: string;
  estadoFisico?: string;
  acessorios?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AparelhoInput = {
  clienteId: string;
  marca: string;
  modelo: string;
  cor?: string;
  imeiSerial?: string;
  estadoFisico?: string;
  acessorios?: string;
  observacoes?: string;
};

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export const listAparelhos = async (
  filters: { query?: string; clienteId?: string } = {},
) => {
  const search = new URLSearchParams();

  if (filters.query?.trim()) {
    search.set("q", filters.query.trim());
  }

  if (filters.clienteId?.trim()) {
    search.set("clienteId", filters.clienteId.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiRequest<ApiResponse<Aparelho[]>>(
    `/aparelhos${suffix}`,
  );

  return response.data;
};

export const getAparelho = async (id: string) => {
  const response = await apiRequest<ApiResponse<Aparelho>>(`/aparelhos/${id}`);

  return response.data;
};

export const createAparelho = async (input: AparelhoInput) => {
  const response = await apiRequest<ApiResponse<Aparelho>>("/aparelhos", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateAparelho = async (id: string, input: AparelhoInput) => {
  const response = await apiRequest<ApiResponse<Aparelho>>(`/aparelhos/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteAparelho = async (id: string) => {
  await apiRequest<void>(`/aparelhos/${id}`, {
    method: "DELETE",
  });
};
