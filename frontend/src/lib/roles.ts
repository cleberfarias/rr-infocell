export type Role = "admin" | "atendente" | "tecnico";

export const ROLE_KEY = "rr.role";
export const NAME_KEY = "rr.nome";

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  atendente: "Atendente",
  tecnico: "Técnico",
};

export const roleNames: Record<Role, string> = {
  admin: "Ricardo R.",
  atendente: "Camila O.",
  tecnico: "Rafael S.",
};

// Rotas permitidas por perfil (sem o prefixo /app)
export const rolePermissions: Record<Role, string[]> = {
  admin: [
    "",
    "ordens",
    "ordens/nova",
    "checklist",
    "manutencao",
    "orcamento",
    "estoque",
    "pdv",
    "financeiro",
    "despesas",
    "clientes",
    "aparelhos",
  ],
  atendente: [
    "",
    "ordens",
    "ordens/nova",
    "checklist",
    "orcamento",
    "pdv",
    "clientes",
    "aparelhos",
  ],
  tecnico: ["", "ordens", "checklist", "manutencao", "orcamento", "estoque"],
};

export const roleHome: Record<Role, string> = {
  admin: "/app",
  atendente: "/app/ordens",
  tecnico: "/app/manutencao",
};

export const getRole = (): Role => {
  const r = (typeof window !== "undefined" &&
    localStorage.getItem(ROLE_KEY)) as Role | null;
  return r && ["admin", "atendente", "tecnico"].includes(r) ? r : "admin";
};

export const setRole = (role: Role) => {
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(NAME_KEY, roleNames[role]);
};

export const clearRole = () => {
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
};

export const canAccess = (role: Role, pathname: string): boolean => {
  // remove /app ou /app/
  const sub = pathname.replace(/^\/app\/?/, "");
  return rolePermissions[role].includes(sub);
};
