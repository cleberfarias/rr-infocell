import { apiRequest } from "@/services/api";
import type { TenantStatus } from "@/types/tenant";
import type { PlanKey } from "@/config/planModules";

export type RemoteTenantBranding = {
  id: string;
  name: string;
  productName: string;
  plan: PlanKey;
  status: TenantStatus;
  trialEndsAt: string | null;
  diasRestantes: number;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  company: {
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
};

export const fetchCurrentTenant = () =>
  apiRequest<{ data: RemoteTenantBranding }>("/tenants/current").then((r) => r.data);

export type TenantSettingsInput = {
  name: string;
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  company: RemoteTenantBranding["company"];
};

export const updateCurrentTenant = (input: TenantSettingsInput) =>
  apiRequest<{ data: TenantSettingsInput & { id: string } }>("/tenants/current", {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((response) => response.data);
