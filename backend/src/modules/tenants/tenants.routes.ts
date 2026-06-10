import { Router, type NextFunction, type Request, type Response } from "express";

import { db } from "../../firebase/admin.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { DEFAULT_TENANT_ID } from "./tenant.config.js";
import type { Tenant } from "./tenant.types.js";

export const tenantsRoutes = Router();

tenantsRoutes.use(resolveTenant);

const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };

tenantsRoutes.get(
  "/current",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);

    if (!db) {
      return response.status(httpStatus.ok).json({ data: buildFallback(tenantId) });
    }

    const snap = await db.collection("tenants").doc(tenantId).get();

    if (!snap.exists) {
      return response.status(httpStatus.ok).json({ data: buildFallback(tenantId) });
    }

    const data = snap.data() as Partial<Tenant>;

    return response.status(httpStatus.ok).json({
      data: {
        id: tenantId,
        name: data.name ?? tenantId,
        productName: data.productName ?? "NextAssist",
        plan: data.plan ?? "empresarial",
        branding: data.branding ?? {},
      },
    });
  }),
);

function buildFallback(tenantId: string) {
  return {
    id: tenantId,
    name: tenantId === DEFAULT_TENANT_ID ? "RR Infocell" : tenantId,
    productName: "NextAssist",
    plan: "empresarial",
    branding: {},
  };
}
