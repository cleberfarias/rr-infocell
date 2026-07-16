import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import {
  despesaInputSchema,
  despesaRecorrenciaSchema,
  despesaSearchSchema,
} from "./despesas.schemas.js";
import { despesasService } from "./despesas.service.js";

export const despesasRoutes = Router();

// Fase 9.9: resolveTenant popula request.tenantId a partir de usuarios/{uid}.
despesasRoutes.use(resolveTenant);

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

const asyncHandler =
  (handler: AsyncRouteHandler) => (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };

const parseOrThrow = <T>(parse: () => T) => {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("validation_error", error.errors[0]?.message ?? "Dados invalidos.");
    }

    throw error;
  }
};

despesasRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const { q, categoria, pago, competencia } = parseOrThrow(() => despesaSearchSchema.parse(request.query));
    const despesas = await despesasService.list(
      {
        categoria,
        pago: pago === "" ? "" : pago === "true",
        search: q,
        competencia,
      },
      tenantId,
    );

    response.status(httpStatus.ok).json({
      data: despesas,
      meta: {
        categoria,
        pago,
        query: q,
        total: despesas.length,
      },
    });
  }),
);

despesasRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    response.status(httpStatus.ok).json({
      data: await despesasService.getById(String(request.params.id), tenantId),
    });
  }),
);

despesasRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => despesaInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await despesasService.create(input, tenantId),
    });
  }),
);

despesasRoutes.post(
  "/:id/recorrencias",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const { meses } = parseOrThrow(() => despesaRecorrenciaSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await despesasService.criarRecorrencias(String(request.params.id), meses, tenantId),
    });
  }),
);

despesasRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => despesaInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await despesasService.update(String(request.params.id), input, tenantId),
    });
  }),
);

despesasRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    await despesasService.delete(String(request.params.id), tenantId);

    response.status(204).send();
  }),
);
