import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { ordemServicoInputSchema, ordemServicoSearchSchema } from "./ordens-servico.schemas.js";
import { ordensServicoService } from "./ordens-servico.service.js";

export const ordensServicoRoutes = Router();

// Fase 9.11: resolveTenant popula request.tenantId a partir de usuarios/{uid}.
// applyPecasDeltas continua usando DEFAULT_TENANT_ID via default do service de movimentações.
ordensServicoRoutes.use(resolveTenant);

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

ordensServicoRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const filters = parseOrThrow(() => ordemServicoSearchSchema.parse(request.query));
    const ordens = await ordensServicoService.list({
      search: filters.q,
      status: filters.status,
      prioridade: filters.prioridade,
      clienteId: filters.clienteId,
      aparelhoId: filters.aparelhoId,
    }, tenantId);

    const page = Math.max(1, parseInt(request.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit as string) || 50));
    const total = ordens.length;
    const totalPages = Math.ceil(total / limit);
    const data = ordens.slice((page - 1) * limit, page * limit);

    response.status(httpStatus.ok).json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        query: filters.q,
        status: filters.status,
        prioridade: filters.prioridade,
        clienteId: filters.clienteId,
        aparelhoId: filters.aparelhoId,
      },
    });
  }),
);

ordensServicoRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await ordensServicoService.getById(id, tenantId),
    });
  }),
);

ordensServicoRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => ordemServicoInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await ordensServicoService.create(input, tenantId),
    });
  }),
);

ordensServicoRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);
    const input = parseOrThrow(() => ordemServicoInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await ordensServicoService.update(id, input),
    });
  }),
);

ordensServicoRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    await ordensServicoService.delete(id);

    response.status(204).send();
  }),
);
