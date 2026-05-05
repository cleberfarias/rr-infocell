import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import {
  ordemEventoInputSchema,
  ordemEventoSearchSchema,
} from "./ordem-eventos.schemas.js";
import { ordemEventosService } from "./ordem-eventos.service.js";

export const ordemEventosRoutes = Router();

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

const asyncHandler =
  (handler: AsyncRouteHandler) =>
  (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };

const parseOrThrow = <T>(parse: () => T) => {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(
        "validation_error",
        error.errors[0]?.message ?? "Dados invalidos.",
      );
    }

    throw error;
  }
};

ordemEventosRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const filters = parseOrThrow(() => ordemEventoSearchSchema.parse(request.query));
    const eventos = await ordemEventosService.list(filters);

    response.status(httpStatus.ok).json({
      data: eventos,
      meta: {
        ordemServicoId: filters.ordemServicoId,
        tipo: filters.tipo,
        total: eventos.length,
      },
    });
  }),
);

ordemEventosRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => ordemEventoInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await ordemEventosService.create(input),
    });
  }),
);
