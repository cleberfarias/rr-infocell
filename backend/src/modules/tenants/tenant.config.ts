import type { Tenant } from "./tenant.types.js";

export const DEFAULT_TENANT_ID = "rr-infocell";

export const defaultTenant: Tenant = {
  id: "rr-infocell",
  slug: "rr-infocell",
  name: "RR Infocell",
  productName: "NextAssist",
  plan: "premium",
  whiteLabel: true,
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};
