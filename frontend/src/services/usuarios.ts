import type { Role } from "@/lib/roles";
import { apiRequest } from "./api";

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

export const listUsuarios = async () => {
  const response = await apiRequest<ApiResponse<Usuario[]>>("/usuarios");

  return response.data;
};

export const listTecnicos = async () => {
  const response =
    await apiRequest<ApiResponse<Usuario[]>>("/usuarios/tecnicos");

  return response.data;
};

export const createUsuario = async (input: UsuarioInput) => {
  const response = await apiRequest<ApiResponse<Usuario>>("/usuarios", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
};

export const updateUsuario = async (uid: string, input: UsuarioUpdateInput) => {
  const response = await apiRequest<ApiResponse<Usuario>>(`/usuarios/${uid}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return response.data;
};
