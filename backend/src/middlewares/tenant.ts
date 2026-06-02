import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./auth.js";
import { DEFAULT_TENANT_ID } from "../modules/tenants/tenant.config.js";
import { db } from "../firebase/admin.js";

export type TenantRequest = AuthenticatedRequest & {
  tenantId?: string;
};

type UsuarioDoc = {
  tenantId?: string;
  status?: string;
};

/**
 * Fase 9.4: resolve tenantId a partir do documento usuarios/{uid} no Firestore.
 * Fallback transitorio para DEFAULT_TENANT_ID enquanto nao houver segundo tenant real.
 *
 * Ordem de resolucao:
 * 1. Se nao ha uid no request (dev bypass) → usa DEFAULT_TENANT_ID silenciosamente
 * 2. Busca usuarios/{uid} no Firestore
 * 3. Doc existe + status ativo + tenantId valido → usa esse tenantId
 * 4. Qualquer desvio → fallback DEFAULT_TENANT_ID + warning no console
 *
 * Nao bloqueia a requisicao nesta fase — o fallback garante compatibilidade.
 * Remover o fallback apenas antes de ativar um segundo tenant real.
 */
export const resolveTenant = async (
  request: TenantRequest,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const uid = request.user?.uid;

    // Sem uid: dev bypass ou token nao verificado — fallback silencioso
    if (!uid) {
      request.tenantId = DEFAULT_TENANT_ID;
      next();
      return;
    }

    if (!db) {
      console.warn("[resolveTenant] Firestore nao configurado — usando DEFAULT_TENANT_ID");
      request.tenantId = DEFAULT_TENANT_ID;
      next();
      return;
    }

    const snap = await db.collection("usuarios").doc(uid).get();

    if (!snap.exists) {
      console.warn(
        `[resolveTenant] usuarios/${uid} nao encontrado — usando DEFAULT_TENANT_ID como fallback`,
      );
      request.tenantId = DEFAULT_TENANT_ID;
      next();
      return;
    }

    const usuario = snap.data() as UsuarioDoc;

    if (!usuario.tenantId) {
      console.warn(
        `[resolveTenant] usuarios/${uid} existe mas nao tem tenantId — usando DEFAULT_TENANT_ID como fallback`,
      );
      request.tenantId = DEFAULT_TENANT_ID;
      next();
      return;
    }

    if (usuario.status !== "ativo") {
      console.warn(
        `[resolveTenant] usuarios/${uid} status="${usuario.status}" — usando DEFAULT_TENANT_ID como fallback`,
      );
      request.tenantId = DEFAULT_TENANT_ID;
      next();
      return;
    }

    request.tenantId = usuario.tenantId;
    next();
  } catch (error) {
    console.error("[resolveTenant] Erro ao resolver tenant — usando DEFAULT_TENANT_ID:", error);
    request.tenantId = DEFAULT_TENANT_ID;
    next();
  }
};

export const getRequestTenantId = (request: TenantRequest): string => {
  return request.tenantId ?? DEFAULT_TENANT_ID;
};

export const getDefaultTenantId = (): string => DEFAULT_TENANT_ID;
