import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { checklistInputSchema, checklistSearchSchema } from "./checklists.schemas.js";
import { checklistsService } from "./checklists.service.js";

export const checklistsRoutes = Router();

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
    const filters = parseOrThrow(() => checklistSearchSchema.parse(request.query));
    const checklists = await checklistsService.list(filters);

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
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await checklistsService.getById(id),
    });
  }),
);

checklistsRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => checklistInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await checklistsService.create(input),
    });
  }),
);

checklistsRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);
    const input = parseOrThrow(() => checklistInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await checklistsService.update(id, input),
    });
  }),
);

checklistsRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    await checklistsService.delete(id);

    response.status(204).send();
  }),
);
