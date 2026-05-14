import { apiRequest } from "./api";

export type ContaTipo = "caixa" | "conta_corrente" | "conta_poupanca" | "pix" | "outro";

export type Conta = {
  id: string;
  nome: string;
  tipo: ContaTipo;
  saldo: number;
  ativa: boolean;
  criadoEm: string;
};

export type ContaInput = {
  nome: string;
  tipo: ContaTipo;
  saldo: number;
};

type ApiResponse<T> = { data: T };

export const listContas = async (): Promise<Conta[]> => {
  const r = await apiRequest<ApiResponse<Conta[]>>("/contas");
  return r.data;
};

export const createConta = async (input: ContaInput): Promise<Conta> => {
  const r = await apiRequest<ApiResponse<Conta>>("/contas", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return r.data;
};

export const updateConta = async (id: string, input: Partial<ContaInput & { ativa: boolean }>): Promise<Conta> => {
  const r = await apiRequest<ApiResponse<Conta>>(`/contas/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return r.data;
};

export const deleteConta = async (id: string): Promise<void> => {
  await apiRequest<void>(`/contas/${id}`, { method: "DELETE" });
};
