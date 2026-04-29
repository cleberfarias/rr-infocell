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
  itens: ChecklistItem[];
  fotos?: ChecklistFoto[];
  observacoesGerais?: string;
  criadoPor?: string;
};

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
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

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const listChecklists = async (
  filters: { ordemServicoId?: string; aparelhoId?: string } = {},
) => {
  const search = new URLSearchParams();

  if (filters.ordemServicoId?.trim()) {
    search.set("ordemServicoId", filters.ordemServicoId.trim());
  }

  if (filters.aparelhoId?.trim()) {
    search.set("aparelhoId", filters.aparelhoId.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<Checklist[]>>(
    `/checklists${suffix}`,
  );

  return response.data;
};

export const createChecklist = async (input: ChecklistInput) => {
  const response = await request<ApiResponse<Checklist>>("/checklists", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateChecklist = async (id: string, input: ChecklistInput) => {
  const response = await request<ApiResponse<Checklist>>(`/checklists/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};
