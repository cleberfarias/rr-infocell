import logoRrInfocell from "@/assets/logo-rrinfocell.png";

export const tenantConfig = {
  productName: "NextAssist",
  systemName: "RR Infocell",
  tenantName: "RR Infocell",
  logo: logoRrInfocell,
  primaryColor: "205 95% 55%",
  secondaryColor: "220 12% 14%",
  plan: "premium",
  whiteLabel: true,
  showPoweredBy: true,
} as const;

export type TenantConfig = typeof tenantConfig;
