export const usuarioRoles = ["admin", "atendente", "tecnico"] as const;

export type UsuarioRole = (typeof usuarioRoles)[number];

export type Usuario = {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  role?: UsuarioRole;
  createdAt?: string;
  lastSignInAt?: string;
};

export type UsuarioInput = {
  email: string;
  displayName?: string;
  password?: string;
  role: UsuarioRole;
  disabled?: boolean;
};

export type UsuarioUpdateInput = {
  displayName?: string;
  password?: string;
  role: UsuarioRole;
  disabled?: boolean;
};
