import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { canUseModule as canUsePlanModule } from "@/config/planModules";
import { tenantConfig } from "@/config/tenantConfig";
import {
  getCurrentTenant,
  getCurrentTenantId,
  getCurrentTenantPlan,
  getTenantBranding,
  isWhiteLabelEnabled,
} from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { fetchCurrentTenant } from "@/services/tenants";
import type {
  TenantBranding,
  TenantConfig,
  TenantId,
  TenantPlan,
} from "@/types/tenant";
import type { ModuleKey } from "@/config/planModules";

type TenantContextValue = {
  tenant: TenantConfig;
  tenantId: TenantId;
  plan: TenantPlan;
  branding: TenantBranding;
  isWhiteLabel: boolean;
  canUseModule: (moduleKey: ModuleKey) => boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

const buildStaticValue = (): TenantContextValue => {
  const tenant = getCurrentTenant();
  const plan = getCurrentTenantPlan();
  return {
    tenant,
    tenantId: getCurrentTenantId(),
    plan,
    branding: getTenantBranding(),
    isWhiteLabel: isWhiteLabelEnabled(),
    canUseModule: (moduleKey) => canUsePlanModule(moduleKey, plan),
  };
};

const applyCssColors = (primary?: string, secondary?: string) => {
  const root = document.documentElement;
  if (primary) root.style.setProperty("--primary", primary);
  if (secondary) root.style.setProperty("--secondary", secondary);
};

const resetCssColors = () => {
  document.documentElement.style.removeProperty("--primary");
  document.documentElement.style.removeProperty("--secondary");
};

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isDevelopmentMode } = useAuth();
  const [value, setValue] = useState<TenantContextValue>(buildStaticValue);

  const loadBranding = useCallback(async () => {
    try {
      const remote = await fetchCurrentTenant();
      const { branding } = remote;

      applyCssColors(branding.primaryColor, branding.secondaryColor);

      setValue((prev) => ({
        ...prev,
        tenant: {
          ...prev.tenant,
          id: (remote.id as TenantId) ?? prev.tenant.id,
          productName: remote.productName ?? prev.tenant.productName,
          systemName: remote.name ?? prev.tenant.systemName,
          tenantName: remote.name ?? prev.tenant.tenantName,
        },
        branding: {
          ...prev.branding,
          logo: branding.logoUrl ?? tenantConfig.logo,
          primaryColor: branding.primaryColor ?? tenantConfig.primaryColor,
          secondaryColor: branding.secondaryColor ?? tenantConfig.secondaryColor,
        },
      }));
    } catch {
      // falha silenciosa — mantém branding estático do tenantConfig
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isDevelopmentMode) {
      loadBranding();
    } else {
      setValue(buildStaticValue());
      resetCssColors();
    }
  }, [isAuthenticated, isDevelopmentMode, loadBranding]);

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant deve ser usado dentro de TenantProvider");
  }

  return context;
};
