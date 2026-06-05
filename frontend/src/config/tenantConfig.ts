import logoRrInfocell from "@/assets/logo-rrinfocell.png";
import type { PlanKey } from "@/config/planModules";

const fallbackTenantId = "rr-infocell";
const fallbackProductName = "NextAssist";
const fallbackSystemName = "RR Infocell";
const fallbackTenantName = "RR Infocell";
const fallbackPlan: PlanKey = "empresarial";

const planKeys: PlanKey[] = ["starter", "profissional", "empresarial"];

const getEnvValue = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed || fallback;
};

const getEnvBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const getEnvPlan = (value: string | undefined, fallback: PlanKey): PlanKey => {
  return planKeys.includes(value as PlanKey) ? (value as PlanKey) : fallback;
};

const getLogoSrc = (envUrl: string | undefined, fallback: string): string => {
  const trimmed = envUrl?.trim();
  return trimmed || fallback;
};

export const tenantConfig = {
  appEnv: getEnvValue(import.meta.env.VITE_APP_ENV, "production"),
  tenantId: getEnvValue(import.meta.env.VITE_TENANT_ID, fallbackTenantId),
  productName: getEnvValue(import.meta.env.VITE_PRODUCT_NAME, fallbackProductName),
  systemName: getEnvValue(import.meta.env.VITE_SYSTEM_NAME, fallbackSystemName),
  tenantName: getEnvValue(import.meta.env.VITE_TENANT_NAME, fallbackTenantName),
  logo: getLogoSrc(import.meta.env.VITE_LOGO_URL, logoRrInfocell),
  primaryColor: "205 95% 55%",
  secondaryColor: "220 12% 14%",
  plan: getEnvPlan(import.meta.env.VITE_DEFAULT_PLAN, fallbackPlan),
  whiteLabel: true,
  showPoweredBy: true,
  enableTenantContext: getEnvBoolean(
    import.meta.env.VITE_ENABLE_TENANT_CONTEXT,
    true,
  ),
} as const;

export type TenantConfig = typeof tenantConfig;
