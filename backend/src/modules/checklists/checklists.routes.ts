import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { checklistInputSchema, checklistSearchSchema } from "./checklists.schemas.js";
import { checklistsService } from "./checklists.service.js";

export const checklistsRoutes = Router();

checklistsRoutes.use(resolveTenant);

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

checklistsRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const filters = parseOrThrow(() => checklistSearchSchema.parse(request.query));
    const checklists = await checklistsService.list(filters, tenantId);

    response.status(httpStatus.ok).json({
      data: checklists,
      meta: {
        total: checklists.length,
        ordemServicoId: filters.ordemServicoId,
        aparelhoId: filters.aparelhoId,
      },
    });
  }),
);

checklistsRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await checklistsService.getById(id, tenantId),
    });
  }),
);

checklistsRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => checklistInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await checklistsService.create(input, tenantId),
    });
  }),
);

checklistsRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const id = String(request.params.id);
    const input = parseOrThrow(() => checklistInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await checklistsService.update(id, input, tenantId),
    });
  }),
);

checklistsRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const id = String(request.params.id);

    await checklistsService.delete(id, tenantId);

    response.status(204).send();
  }),
);
