import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { despesaInputSchema, despesaSearchSchema } from "./despesas.schemas.js";
import { despesasService } from "./despesas.service.js";

export const despesasRoutes = Router();

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
    const { q, categoria, pago } = parseOrThrow(() => despesaSearchSchema.parse(request.query));
    const despesas = await despesasService.list({
      categoria,
      pago: pago === "" ? "" : pago === "true",
      search: q,
    });

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
    response.status(httpStatus.ok).json({
      data: await despesasService.getById(String(request.params.id)),
    });
  }),
);

despesasRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => despesaInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await despesasService.create(input),
    });
  }),
);

despesasRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => despesaInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await despesasService.update(String(request.params.id), input),
    });
  }),
);

despesasRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    await despesasService.delete(String(request.params.id));

    response.status(204).send();
  }),
);
