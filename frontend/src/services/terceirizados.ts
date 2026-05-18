import { apiRequest } from "./api";

export type TerceirizadoStatus = "pendente" | "pago";

export type Terceirizado = {
  id: string;
  clienteNome?: string | null;
  responsavel?: string | null;
  descricao?: string | null;
  valorCobrado: number;
  valorRepasse: number;
  lucro: number;
  statusRepasse: TerceirizadoStatus;
  observacoes?: string | null;
  criadoEm: string;
};

export type TerceirizadoInput = {
  clienteNome?: string;
  responsavel?: string;
  descricao?: string;
  valorCobrado: number;
  valorRepasse: number;
  statusRepasse: TerceirizadoStatus;
  observacoes?: string;
};

type ApiResponse<T> = { data: T };

export const listTerceirizados = async (): Promise<Terceirizado[]> => {
  const response = await apiRequest<ApiResponse<Terceirizado[]>>("/terceirizados");
  return response.data;
};

export const createTerceirizado = async (input: TerceirizadoInput): Promise<Terceirizado> => {
  const response = await apiRequest<ApiResponse<Terceirizado>>("/terceirizados", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
};

export const updateStatusRepasse = async (
  id: string,
  statusRepasse: TerceirizadoStatus,
): Promise<void> => {
  await apiRequest<void>(`/terceirizados/${id}/status-repasse`, {
    method: "PATCH",
    body: JSON.stringify({ statusRepasse }),
  });
};

export const deleteTerceirizado = async (id: string): Promise<void> => {
  await apiRequest<void>(`/terceirizados/${id}`, { method: "DELETE" });
};
