export const moduleKeys = [
  "dashboard",
  "clientes",
  "ordensServico",
  "estoque",
  "financeiro",
  "relatorios",
  "mensagensAutomaticas",
  "whiteLabel",
  "multiUsuarios",
  "multiUnidades",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];

export type PlanKey = "starter" | "profissional" | "empresarial";

export type PlanModules = Record<ModuleKey, boolean>;

export const planModules: Record<PlanKey, PlanModules> = {
  starter: {
    dashboard: true,
    clientes: true,
    ordensServico: true,
    estoque: false,
    financeiro: false,
    relatorios: false,
    mensagensAutomaticas: false,
    whiteLabel: false,
    multiUsuarios: false,
    multiUnidades: false,
  },
  profissional: {
    dashboard: true,
    clientes: true,
    ordensServico: true,
    estoque: true,
    financeiro: true,
    relatorios: true,
    mensagensAutomaticas: false,
    whiteLabel: false,
    multiUsuarios: true,
    multiUnidades: false,
  },
  empresarial: {
    dashboard: true,
    clientes: true,
    ordensServico: true,
    estoque: true,
    financeiro: true,
    relatorios: true,
    mensagensAutomaticas: true,
    whiteLabel: true,
    multiUsuarios: true,
    multiUnidades: true,
  },
} as const;

export const canUseModule = (moduleKey: ModuleKey, plan: PlanKey): boolean => {
  return planModules[plan]?.[moduleKey] ?? false;
};
