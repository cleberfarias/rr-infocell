import { apiRequest } from "@/services/api";

export type RemoteTenantBranding = {
  id: string;
  name: string;
  productName: string;
  plan: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
};

export const fetchCurrentTenant = () =>
  apiRequest<{ data: RemoteTenantBranding }>("/tenants/current").then((r) => r.data);
