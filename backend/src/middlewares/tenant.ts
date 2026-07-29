import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./auth.js";
import { db } from "../firebase/admin.js";
import { DEFAULT_TENANT_ID } from "../modules/tenants/tenant.config.js";
import { AppError } from "../shared/errors.js";
import { httpStatus } from "../shared/http-status.js";

export type TenantRequest = AuthenticatedRequest & {
  tenantId?: string;
};

type UsuarioDoc = {
  tenantId?: string;
  status?: string;
};

/**
 * Resolve o tenant pelo documento usuarios/{uid} no Firestore.
 *
 * O tenant padrao existe apenas para o bypass local sem autenticacao. Uma
 * requisicao autenticada nunca pode cair no tenant RR Infocell por fallback.
 */
export const resolveTenant = async (
  request: TenantRequest,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const uid = request.user?.uid;

    // Em producao, requireAuth bloqueia a requisicao antes deste middleware.
    if (!uid) {
      request.tenantId = DEFAULT_TENANT_ID;
      next();
      return;
    }

    if (!db) {
      throw new AppError(
        "tenant_store_unavailable",
        "Nao foi possivel identificar a empresa do usuario.",
        httpStatus.internalServerError,
      );
    }

    const snap = await db.collection("usuarios").doc(uid).get();

    if (!snap.exists) {
      throw new AppError(
        "tenant_user_not_configured",
        "Usuario sem empresa vinculada. Entre em contato com o suporte.",
        httpStatus.forbidden,
      );
    }

    const usuario = snap.data() as UsuarioDoc;

    if (!usuario.tenantId) {
      throw new AppError(
        "tenant_not_configured",
        "Usuario sem empresa vinculada. Entre em contato com o suporte.",
        httpStatus.forbidden,
      );
    }

    if (usuario.status !== "ativo") {
      throw new AppError(
        "tenant_user_inactive",
        "Usuario inativo. Entre em contato com o administrador da empresa.",
        httpStatus.forbidden,
      );
    }

    request.tenantId = usuario.tenantId;
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            "tenant_resolution_failed",
            "Nao foi possivel identificar a empresa do usuario.",
            httpStatus.internalServerError,
          ),
    );
  }
};

export const getRequestTenantId = (request: TenantRequest): string => {
  if (request.tenantId) return request.tenantId;
  if (!request.user?.uid) return DEFAULT_TENANT_ID;

  throw new AppError(
    "tenant_not_resolved",
    "Empresa do usuario nao identificada.",
    httpStatus.forbidden,
  );
};

export const getDefaultTenantId = (): string => DEFAULT_TENANT_ID;
