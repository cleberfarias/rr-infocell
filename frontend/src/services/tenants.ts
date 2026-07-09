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
};

export const fetchCurrentTenant = () =>
  apiRequest<{ data: RemoteTenantBranding }>("/tenants/current").then((r) => r.data);
