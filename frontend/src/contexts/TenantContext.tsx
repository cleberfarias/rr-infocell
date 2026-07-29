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
import { EMPRESA } from "@/constants/company";
import type {
  TenantBranding,
  TenantConfig,
  TenantId,
  TenantPlan,
  TenantStatus,
  TenantCompany,
} from "@/types/tenant";
import type { ModuleKey } from "@/config/planModules";

type TenantContextValue = {
  tenant: TenantConfig;
  tenantId: TenantId;
  plan: TenantPlan;
  status: TenantStatus;
  trialEndsAt: string | null;
  diasRestantes: number;
  branding: TenantBranding;
  company: TenantCompany;
  isWhiteLabel: boolean;
  canUseModule: (moduleKey: ModuleKey) => boolean;
  refreshTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

const updatePageTitle = (systemName: string) => {
  document.title = `${systemName} – Sistema de Assistência Técnica`;
};

const buildStaticValue = (): TenantContextValue => {
  const tenant = getCurrentTenant();
  const plan = getCurrentTenantPlan();
  updatePageTitle(tenant.systemName);
  return {
    tenant,
    tenantId: getCurrentTenantId(),
    plan,
    status: tenant.status,
    trialEndsAt: null,
    diasRestantes: 0,
    branding: getTenantBranding(),
    company: EMPRESA,
    isWhiteLabel: isWhiteLabelEnabled(),
    canUseModule: (moduleKey) => canUsePlanModule(moduleKey, plan),
    refreshTenant: async () => undefined,
  };
};

const buildCompany = (
  name: string,
  remote: Partial<Omit<TenantCompany, "nome" | "enderecoCompleto">>,
): TenantCompany => {
  const endereco = remote.endereco ?? EMPRESA.endereco;
  const bairro = remote.bairro ?? EMPRESA.bairro;
  const cidade = remote.cidade ?? EMPRESA.cidade;
  const uf = remote.uf ?? EMPRESA.uf;
  return {
    ...EMPRESA,
    ...remote,
    nome: name,
    endereco,
    bairro,
    cidade,
    uf,
    enderecoCompleto: [endereco, bairro, cidade && uf ? `${cidade} - ${uf}` : cidade || uf]
      .filter(Boolean)
      .join(", "),
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
      const plan = remote.plan ?? getCurrentTenantPlan();

      applyCssColors(branding.primaryColor, branding.secondaryColor);

      const systemName = remote.name ?? getCurrentTenant().systemName;
      updatePageTitle(systemName);
      setValue((prev) => ({
        ...prev,
        tenant: {
          ...prev.tenant,
          id: (remote.id as TenantId) ?? prev.tenant.id,
          productName: remote.productName ?? prev.tenant.productName,
          systemName,
          tenantName: remote.name ?? prev.tenant.tenantName,
          plan,
          status: remote.status ?? prev.tenant.status,
        },
        tenantId: (remote.id as TenantId) ?? prev.tenantId,
        plan,
        status: remote.status ?? prev.status,
        trialEndsAt: remote.trialEndsAt ?? null,
        diasRestantes: Math.max(0, remote.diasRestantes ?? 0),
        branding: {
          ...prev.branding,
          logo: branding.logoUrl ?? tenantConfig.logo,
          primaryColor: branding.primaryColor ?? tenantConfig.primaryColor,
          secondaryColor: branding.secondaryColor ?? tenantConfig.secondaryColor,
        },
        company: buildCompany(remote.name ?? prev.company.nome, remote.company ?? {}),
        canUseModule: (moduleKey) => canUsePlanModule(moduleKey, plan),
      }));
    } catch {
      // falha silenciosa — mantém branding estático do tenantConfig
    }
  }, []);

  const refreshTenant = useCallback(async () => {
    await loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    if (isAuthenticated && !isDevelopmentMode) {
      loadBranding();
    } else {
      setValue(buildStaticValue());
      resetCssColors();
    }
  }, [isAuthenticated, isDevelopmentMode, loadBranding]);

  return (
    <TenantContext.Provider value={{ ...value, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant deve ser usado dentro de TenantProvider");
  }

  return context;
};
