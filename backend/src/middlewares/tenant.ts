import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./auth.js";
import { DEFAULT_TENANT_ID } from "../modules/tenants/tenant.config.js";

export type TenantRequest = AuthenticatedRequest & {
  tenantId?: string;
};

/**
 * Fase 8.1: resolve o tenant da requisicao.
 * Por enquanto retorna sempre "rr-infocell" (tenant fixo).
 * Futuramente: resolver do custom claim do token Firebase ou lookup no banco.
 */
export const resolveTenant = (
  request: TenantRequest,
  _response: Response,
  next: NextFunction,
) => {
  request.tenantId = DEFAULT_TENANT_ID;
  next();
};

export const getRequestTenantId = (request: TenantRequest): string => {
  return request.tenantId ?? DEFAULT_TENANT_ID;
};

export const getDefaultTenantId = (): string => DEFAULT_TENANT_ID;
