export const ordemServicoStatus = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
  "entregue",
  "cancelado",
] as const;

export type OrdemServicoStatus = (typeof ordemServicoStatus)[number];

export type OrdemServico = {
  id: string;
  numero: number;
  clienteId: string;
  aparelhoId: string;
  checklistId?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  status: OrdemServicoStatus;
  tecnicoResponsavel?: string;
  valorPecas: number;
  valorMaoObra: number;
  valorTotal: number;
  entradaEm: string;
  previsaoEntregaEm?: string;
  concluidaEm?: string;
  entregueEm?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrdemServicoInput = {
  clienteId: string;
  aparelhoId: string;
  checklistId?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  status?: OrdemServicoStatus;
  tecnicoResponsavel?: string;
  valorPecas?: number;
  valorMaoObra?: number;
  entradaEm?: string;
  previsaoEntregaEm?: string;
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

export const listOrdensServico = async (
  filters: {
    query?: string;
    status?: OrdemServicoStatus | "";
    clienteId?: string;
    aparelhoId?: string;
  } = {},
) => {
  const search = new URLSearchParams();

  if (filters.query?.trim()) {
    search.set("q", filters.query.trim());
  }

  if (filters.status) {
    search.set("status", filters.status);
  }

  if (filters.clienteId?.trim()) {
    search.set("clienteId", filters.clienteId.trim());
  }

  if (filters.aparelhoId?.trim()) {
    search.set("aparelhoId", filters.aparelhoId.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<OrdemServico[]>>(
    `/ordens-servico${suffix}`,
  );

  return response.data;
};

export const createOrdemServico = async (input: OrdemServicoInput) => {
  const response = await request<ApiResponse<OrdemServico>>("/ordens-servico", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateOrdemServico = async (
  id: string,
  input: OrdemServicoInput,
) => {
  const response = await request<ApiResponse<OrdemServico>>(
    `/ordens-servico/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  return response.data;
};

export const deleteOrdemServico = async (id: string) => {
  await request<void>(`/ordens-servico/${id}`, {
    method: "DELETE",
  });
};
