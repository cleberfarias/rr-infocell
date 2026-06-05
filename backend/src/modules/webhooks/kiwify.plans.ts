import type { TenantPlan } from "../tenants/tenant.types.js";

export const KIWIFY_PRODUCT_PLAN: Record<string, TenantPlan> = {
  "e06e4d60-6127-11f1-a2c7-a3244f6b76bf": "starter",
  "395b31e0-6128-11f1-822e-ef7ca5d3deca": "profissional",
  "874024b0-6128-11f1-b136-99d1ab795d07": "empresarial",
};

export const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: "Starter",
  profissional: "Profissional",
  empresarial: "Empresarial",
};
