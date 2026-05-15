import { apiRequest } from "./api";

export type Marca = { id: string; nome: string; padrao: boolean };

export const listMarcas = async (): Promise<Marca[]> => {
  const response = await apiRequest<{ data: Marca[] }>("/marcas");
  return response.data;
};

export const createMarca = async (nome: string): Promise<Marca> => {
  const response = await apiRequest<{ data: Marca }>("/marcas", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
  return response.data;
};
