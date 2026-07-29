export type TenantPlan = "starter" | "profissional" | "empresarial";
export type TenantStatus = "active" | "inactive" | "trial" | "suspended";

export type TenantBranding = {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

export type TenantCompany = {
  cnpj?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  whatsapp?: string;
  horarioAtendimento?: string;
  tecnicoPadrao?: string;
  mensagemFinal?: string;
  rodape?: string;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  productName: string;
  plan: TenantPlan;
  whiteLabel: boolean;
  status: TenantStatus;
  branding?: TenantBranding;
  company?: TenantCompany;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantSettingsInput = {
  name: string;
  branding: TenantBranding;
  company: TenantCompany;
};

export type TenantInput = {
  slug: string;
  name: string;
  productName: string;
  plan: TenantPlan;
  whiteLabel?: boolean;
  status?: TenantStatus;
};
