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
  const response = await request<ApiResponse<Aparelho[]>>(
    `/aparelhos${suffix}`,
  );

  return response.data;
};

export const createAparelho = async (input: AparelhoInput) => {
  const response = await request<ApiResponse<Aparelho>>("/aparelhos", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateAparelho = async (id: string, input: AparelhoInput) => {
  const response = await request<ApiResponse<Aparelho>>(`/aparelhos/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteAparelho = async (id: string) => {
  await request<void>(`/aparelhos/${id}`, {
    method: "DELETE",
  });
};
