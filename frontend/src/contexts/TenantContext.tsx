import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { canUseModule as canUsePlanModule } from "@/config/planModules";
import {
  getCurrentTenant,
  getCurrentTenantId,
  getCurrentTenantPlan,
  getTenantBranding,
  isWhiteLabelEnabled,
} from "@/lib/tenant";
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

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<TenantContextValue>(() => {
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
  }, []);

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
