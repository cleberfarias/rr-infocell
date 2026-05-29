import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { clienteInputSchema, clienteSearchSchema } from "./clientes.schemas.js";
import { clientesService } from "./clientes.service.js";

export const clientesRoutes = Router();

// Fase 9.8: resolveTenant popula request.tenantId a partir de usuarios/{uid}.
clientesRoutes.use(resolveTenant);

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

clientesRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const { q } = parseOrThrow(() => clienteSearchSchema.parse(request.query));
    const clientes = await clientesService.list(q, tenantId);

    const page = Math.max(1, parseInt(request.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit as string) || 50));
    const total = clientes.length;
    const totalPages = Math.ceil(total / limit);
    const data = clientes.slice((page - 1) * limit, page * limit);

    response.status(httpStatus.ok).json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        query: q,
      },
    });
  }),
);

clientesRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await clientesService.getById(id),
    });
  }),
);

clientesRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => clienteInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await clientesService.create(input, tenantId),
    });
  }),
);

clientesRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);
    const input = parseOrThrow(() => clienteInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await clientesService.update(id, input),
    });
  }),
);

clientesRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    await clientesService.delete(id);

    response.status(204).send();
  }),
);
