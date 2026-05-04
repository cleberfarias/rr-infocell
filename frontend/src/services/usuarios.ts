import { firebaseAuth } from "@/lib/firebase";
import type { Role } from "@/lib/roles";

export type Usuario = {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  role?: Role;
  createdAt?: string;
  lastSignInAt?: string;
};

export type UsuarioInput = {
  email: string;
  displayName?: string;
  password?: string;
  role: Role;
  disabled?: boolean;
};

export type UsuarioUpdateInput = {
  displayName?: string;
  password?: string;
  role: Role;
  disabled?: boolean;
};

type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

const getAuthHeaders = async () => {
  const user = firebaseAuth?.currentUser;

  if (!user) {
    throw new Error(
      "Entre com um usuario administrador real do Firebase Auth para gerenciar usuarios.",
    );
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
};

const request = async <T>(path: string, init?: RequestInit) => {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(
      payload?.error?.message ?? "Nao foi possivel concluir a operacao.",
    );
  }

  return (await response.json()) as T;
};

export const listUsuarios = async () => {
  const response = await request<ApiResponse<Usuario[]>>("/usuarios");

  return response.data;
};

export const createUsuario = async (input: UsuarioInput) => {
  const response = await request<ApiResponse<Usuario>>("/usuarios", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateUsuario = async (
  uid: string,
  input: UsuarioUpdateInput,
) => {
  const response = await request<ApiResponse<Usuario>>(`/usuarios/${uid}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};
