import { tenantConfig } from "@/config/tenantConfig";
import { canUseModule, moduleKeys } from "@/config/planModules";
import type {
  TenantBranding,
  TenantConfig,
  TenantId,
  TenantModuleAccess,
  TenantPlan,
} from "@/types/tenant";

const CURRENT_TENANT_ID: TenantId = "rr-infocell";

export const getCurrentTenant = (): TenantConfig => ({
  id: CURRENT_TENANT_ID,
  productName: tenantConfig.productName,
  systemName: tenantConfig.systemName,
  tenantName: tenantConfig.tenantName,
  plan: tenantConfig.plan,
  status: "active",
  branding: {
    logo: tenantConfig.logo,
    primaryColor: tenantConfig.primaryColor,
    secondaryColor: tenantConfig.secondaryColor,
    whiteLabel: tenantConfig.whiteLabel,
    showPoweredBy: tenantConfig.showPoweredBy,
  },
});

export const getCurrentTenantId = (): TenantId => getCurrentTenant().id;

export const getCurrentTenantPlan = (): TenantPlan => getCurrentTenant().plan;

export const isWhiteLabelEnabled = (): boolean =>
  getCurrentTenant().branding.whiteLabel;

export const getTenantBranding = (): TenantBranding =>
  getCurrentTenant().branding;

export const getCurrentTenantModuleAccess = (): TenantModuleAccess => {
  const plan = getCurrentTenantPlan();

  return moduleKeys.reduce((access, moduleKey) => {
    access[moduleKey] = canUseModule(moduleKey, plan);
    return access;
  }, {} as TenantModuleAccess);
};
