import type { ModuleKey, PlanKey } from "@/config/planModules";

export type TenantId = string;

export type TenantPlan = PlanKey;

export type TenantStatus = "active" | "inactive" | "trial" | "suspended";

export type TenantBranding = {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  whiteLabel: boolean;
  showPoweredBy: boolean;
};

export type TenantCompany = {
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  enderecoCompleto: string;
  telefone: string;
  whatsapp: string;
  horarioAtendimento: string;
  tecnicoPadrao: string;
  mensagemFinal: string;
  rodape: string;
};

export type TenantConfig = {
  id: TenantId;
  productName: string;
  systemName: string;
  tenantName: string;
  plan: TenantPlan;
  status: TenantStatus;
  branding: TenantBranding;
};

export type TenantModuleAccess = Record<ModuleKey, boolean>;
