export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClienteInput = {
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
};

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Nao foi possivel concluir a operacao.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const listClientes = async (query: string) => {
  const search = new URLSearchParams();

  if (query.trim()) {
    search.set("q", query.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await request<ApiResponse<Cliente[]>>(`/clientes${suffix}`);

  return response.data;
};

export const createCliente = async (input: ClienteInput) => {
  const response = await request<ApiResponse<Cliente>>("/clientes", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateCliente = async (id: string, input: ClienteInput) => {
  const response = await request<ApiResponse<Cliente>>(`/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const deleteCliente = async (id: string) => {
  await request<void>(`/clientes/${id}`, {
    method: "DELETE",
  });
};
