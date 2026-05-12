import { apiRequest } from "./api";
export const checklistItemStatus = [
  "funcionando",
  "com_defeito",
  "nao_testado",
] as const;

export type ChecklistItemStatus = (typeof checklistItemStatus)[number];

export type ChecklistItem = {
  nome: string;
  status: ChecklistItemStatus;
  observacao?: string;
};

export type ChecklistFoto = {
  nome: string;
  url: string;
  path: string;
  contentType?: string;
  uploadedAt: string;
};

export type Checklist = {
  id: string;
  ordemServicoId: string;
  aparelhoId: string;
  tipo: "entrada" | "saida";
  itens: ChecklistItem[];
  fotos: ChecklistFoto[];
  observacoesGerais?: string;
  criadoPor?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistInput = {
  ordemServicoId: string;
  aparelhoId: string;
  tipo?: "entrada" | "saida";
  itens: ChecklistItem[];
  fotos?: ChecklistFoto[];
  observacoesGerais?: string;
  criadoPor?: string;
};

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export const listChecklists = async (
  filters: {
    ordemServicoId?: string;
    aparelhoId?: string;
    tipo?: "entrada" | "saida" | "";
  } = {},
) => {
  const search = new URLSearchParams();

  if (filters.ordemServicoId?.trim()) {
    search.set("ordemServicoId", filters.ordemServicoId.trim());
  }

  if (filters.aparelhoId?.trim()) {
    search.set("aparelhoId", filters.aparelhoId.trim());
  }

  if (
    "tipo" in filters &&
    typeof filters.tipo === "string" &&
    filters.tipo.trim()
  ) {
    search.set("tipo", filters.tipo.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiRequest<ApiResponse<Checklist[]>>(
    `/checklists${suffix}`,
  );

  return response.data;
};

export const createChecklist = async (input: ChecklistInput) => {
  const response = await apiRequest<ApiResponse<Checklist>>("/checklists", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateChecklist = async (id: string, input: ChecklistInput) => {
  const response = await apiRequest<ApiResponse<Checklist>>(
    `/checklists/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return response.data;
};
