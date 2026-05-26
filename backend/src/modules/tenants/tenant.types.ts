export type TenantPlan = "free" | "starter" | "premium" | "enterprise";
export type TenantStatus = "active" | "inactive" | "suspended";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  productName: string;
  plan: TenantPlan;
  whiteLabel: boolean;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
};

export type TenantInput = {
  slug: string;
  name: string;
  productName: string;
  plan: TenantPlan;
  whiteLabel?: boolean;
  status?: TenantStatus;
};
