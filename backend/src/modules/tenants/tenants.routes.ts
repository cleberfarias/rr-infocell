import { Router, type NextFunction, type Request, type Response } from "express";
import { Timestamp } from "firebase-admin/firestore";

import { env } from "../../config/env.js";
import { auth, db } from "../../firebase/admin.js";
import { requireRole, type AuthenticatedRequest } from "../../middlewares/auth.js";
import { httpStatus } from "../../shared/http-status.js";
import { AppError } from "../../shared/errors.js";
import { isPlatformOwner } from "../../shared/platform-owner.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { DEFAULT_TENANT_ID, defaultTenant } from "./tenant.config.js";
import { tenantSettingsSchema } from "./tenant.schemas.js";
import type { Tenant } from "./tenant.types.js";

export const tenantsRoutes = Router();

tenantsRoutes.use(resolveTenant);

const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };

const requireDonoPlataforma = (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) => {
  if (env.NODE_ENV !== "production" && !request.user) {
    next();
    return;
  }

  if (!isPlatformOwner(request)) {
    next(
      new AppError(
        "platform_admin_forbidden",
        "Apenas administradores internos da plataforma podem acessar leads e trials.",
        httpStatus.forbidden,
      ),
    );
    return;
  }

  next();
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toIso(value: unknown): string | null {
  return toDate(value)?.toISOString() ?? null;
}

function diasRestantes(trialEndsAt: unknown): number {
  const fim = toDate(trialEndsAt);
  if (!fim) return 0;
  return Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 86_400_000));
}

async function getLastSignInTime(email?: string): Promise<string | null> {
  if (!auth || !email) return null;

  try {
    const user = await auth.getUserByEmail(email);
    return user.metadata.lastSignInTime
      ? new Date(user.metadata.lastSignInTime).toISOString()
      : null;
  } catch {
    return null;
  }
}

function buildDefaultTenantLead() {
  return {
    id: defaultTenant.id,
    slug: defaultTenant.slug,
    nome: "",
    email: "",
    empresa: defaultTenant.name,
    planoTrial: defaultTenant.plan,
    status: defaultTenant.status,
    criadoEm: toIso(defaultTenant.createdAt),
    trialEndsAt: null,
    diasRestantes: 0,
    jaAcessou: true,
    ultimoAcessoEm: null,
    origemCadastro: {
      utmSource: null,
      utmCampaign: null,
      utmMedium: null,
      paginaOrigem: null,
      landingPage: null,
      userAgent: null,
      ipApprox: null,
      registeredAt: null,
    },
  };
}

tenantsRoutes.get(
  "/trials",
  requireRole("admin"),
  requireDonoPlataforma,
  asyncHandler(async (_request, response) => {
    if (!db) {
      return response.status(httpStatus.internalServerError).json({
        error: {
          code: "firebase_not_configured",
          message: "Firebase Admin SDK nao esta configurado.",
        },
      });
    }

    const snap = await db.collection("tenants").orderBy("createdAt", "desc").limit(200).get();
    const rows = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data() as Record<string, unknown>;
        const email = typeof data.ownerEmail === "string" ? data.ownerEmail : "";
        const ultimoAcessoEm = await getLastSignInTime(email);
        const origemCadastro =
          data.origemCadastro && typeof data.origemCadastro === "object"
            ? (data.origemCadastro as Record<string, unknown>)
            : {};

        return {
          id: doc.id,
          slug: typeof data.slug === "string" ? data.slug : doc.id,
          nome: typeof data.ownerName === "string" ? data.ownerName : "",
          email,
          empresa: typeof data.name === "string" ? data.name : doc.id,
          planoTrial: typeof data.plan === "string" ? data.plan : "trial",
          status: typeof data.status === "string" ? data.status : "trial",
          criadoEm: toIso(data.createdAt),
          trialEndsAt: toIso(data.trialEndsAt),
          diasRestantes: diasRestantes(data.trialEndsAt),
          jaAcessou: Boolean(ultimoAcessoEm),
          ultimoAcessoEm,
          origemCadastro: {
            utmSource: origemCadastro.utmSource ?? null,
            utmCampaign: origemCadastro.utmCampaign ?? null,
            utmMedium: origemCadastro.utmMedium ?? null,
            paginaOrigem: origemCadastro.paginaOrigem ?? null,
            landingPage: origemCadastro.landingPage ?? null,
            userAgent: origemCadastro.userAgent ?? null,
            ipApprox: origemCadastro.ipApprox ?? null,
            registeredAt: toIso(origemCadastro.registeredAt),
          },
        };
      }),
    );

    const data = rows.some((row) => row.id === DEFAULT_TENANT_ID)
      ? rows
      : [buildDefaultTenantLead(), ...rows];

    return response.status(httpStatus.ok).json({
      data,
      meta: {
        total: data.length,
        ativos: data.filter((row) => row.status === "trial" && row.diasRestantes > 0).length,
        clientesAtivos: data.filter((row) => row.status === "active").length,
        expirados: data.filter((row) => row.status === "trial" && row.diasRestantes === 0).length,
        acessaram: data.filter((row) => row.jaAcessou).length,
      },
    });
  }),
);

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
        status: data.status ?? "active",
        trialEndsAt: toIso(data.trialEndsAt),
        diasRestantes: diasRestantes(data.trialEndsAt),
        branding: data.branding ?? {},
        company: data.company ?? {},
      },
    });
  }),
);

tenantsRoutes.patch(
  "/current",
  asyncHandler(async (request, response) => {
    const authenticatedRequest = request as AuthenticatedRequest & TenantRequest;
    if (authenticatedRequest.user?.role !== "admin") {
      throw new AppError(
        "forbidden",
        "Apenas administradores podem alterar as configuracoes da empresa.",
        httpStatus.forbidden,
      );
    }

    if (!db) {
      throw new AppError(
        "firebase_not_configured",
        "Firebase Admin SDK nao esta configurado.",
        httpStatus.internalServerError,
      );
    }

    const parsed = tenantSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(
        "validation_error",
        parsed.error.errors[0]?.message ?? "Configuracoes da empresa invalidas.",
        httpStatus.badRequest,
      );
    }
    const input = parsed.data;
    const tenantId = getRequestTenantId(authenticatedRequest);
    const now = new Date().toISOString();
    const branding = {
      ...input.branding,
      logoUrl: input.branding.logoUrl || undefined,
    };

    const tenantRef = db.collection("tenants").doc(tenantId);
    const tenantSnapshot = await tenantRef.get();
    const createDefaults = tenantSnapshot.exists
      ? {}
      : {
          id: tenantId,
          slug: tenantId,
          productName: defaultTenant.productName,
          plan: defaultTenant.plan,
          whiteLabel: true,
          status: defaultTenant.status,
          createdAt: now,
        };

    await tenantRef.set(
      {
        ...createDefaults,
        name: input.name,
        branding,
        company: input.company,
        updatedAt: now,
      },
      { merge: true },
    );

    response.status(httpStatus.ok).json({
      data: {
        id: tenantId,
        name: input.name,
        branding,
        company: input.company,
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
    status: "active",
    trialEndsAt: null,
    diasRestantes: 0,
    branding: {},
    company: {},
  };
}
