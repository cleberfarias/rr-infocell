import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { aparelhoInputSchema, aparelhoSearchSchema } from "./aparelhos.schemas.js";
import { aparelhosService } from "./aparelhos.service.js";

export const aparelhosRoutes = Router();

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

aparelhosRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const { q, clienteId } = parseOrThrow(() => aparelhoSearchSchema.parse(request.query));
    const aparelhos = await aparelhosService.list({ search: q, clienteId });

    response.status(httpStatus.ok).json({
      data: aparelhos,
      meta: {
        total: aparelhos.length,
        query: q,
        clienteId,
      },
    });
  }),
);

aparelhosRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await aparelhosService.getById(id),
    });
  }),
);

aparelhosRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => aparelhoInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await aparelhosService.create(input),
    });
  }),
);

aparelhosRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);
    const input = parseOrThrow(() => aparelhoInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await aparelhosService.update(id, input),
    });
  }),
);

aparelhosRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    await aparelhosService.delete(id);

    response.status(204).send();
  }),
);
