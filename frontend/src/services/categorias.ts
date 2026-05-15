import { apiRequest } from "./api";

export type Categoria = { id: string; nome: string; padrao: boolean };

export const listCategorias = async (): Promise<Categoria[]> => {
  const response = await apiRequest<{ data: Categoria[] }>("/categorias");
  return response.data;
};

export const createCategoria = async (nome: string): Promise<Categoria> => {
  const response = await apiRequest<{ data: Categoria }>("/categorias", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
  return response.data;
};
