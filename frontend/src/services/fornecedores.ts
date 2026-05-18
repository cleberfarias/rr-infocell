import { apiRequest } from "./api";

export type Fornecedor = { id: string; nome: string };

type ApiResponse<T> = { data: T };

export const listFornecedores = async (): Promise<Fornecedor[]> => {
  const response = await apiRequest<ApiResponse<Fornecedor[]>>("/fornecedores");
  return response.data;
};

export const createFornecedor = async (nome: string): Promise<Fornecedor> => {
  const response = await apiRequest<ApiResponse<Fornecedor>>("/fornecedores", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
  return response.data;
};

export const updateFornecedor = async (id: string, nome: string): Promise<Fornecedor> => {
  const response = await apiRequest<ApiResponse<Fornecedor>>(`/fornecedores/${id}`, {
    method: "PUT",
    body: JSON.stringify({ nome }),
  });
  return response.data;
};

export const deleteFornecedor = async (id: string): Promise<void> => {
  await apiRequest<void>(`/fornecedores/${id}`, { method: "DELETE" });
};
