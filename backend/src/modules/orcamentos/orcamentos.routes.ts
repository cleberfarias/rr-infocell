import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import {
  orcamentoInputSchema,
  orcamentoSearchSchema,
} from "./orcamentos.schemas.js";
import { orcamentosService } from "./orcamentos.service.js";

export const orcamentosRoutes = Router();

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

orcamentosRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const filters = parseOrThrow(() => orcamentoSearchSchema.parse(request.query));
    const orcamentos = await orcamentosService.list(filters);

    response.status(httpStatus.ok).json({
      data: orcamentos,
      meta: {
        ordemServicoId: filters.ordemServicoId,
        status: filters.status,
        total: orcamentos.length,
      },
    });
  }),
);

orcamentosRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => orcamentoInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await orcamentosService.upsert(input),
    });
  }),
);
