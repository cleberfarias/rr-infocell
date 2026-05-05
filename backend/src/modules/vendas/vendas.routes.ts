import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { vendaInputSchema, vendaSearchSchema } from "./vendas.schemas.js";
import { vendasService } from "./vendas.service.js";

export const vendasRoutes = Router();

const parseOrThrow = <T>(parse: () => T) => {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(
        "validation_error",
        error.issues[0]?.message ?? "Dados invalidos.",
        httpStatus.badRequest,
      );
    }

    throw error;
  }
};

const handler =
  (callback: (request: Request, response: Response) => Promise<void>) =>
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await callback(request, response);
    } catch (error) {
      next(error);
    }
  };

vendasRoutes.get(
  "/",
  handler(async (request, response) => {
    const filters = parseOrThrow(() => vendaSearchSchema.parse(request.query));
    const vendas = await vendasService.list(filters);

    response.json({
      data: vendas,
      meta: {
        total: vendas.length,
      },
    });
  }),
);

vendasRoutes.post(
  "/",
  handler(async (request, response) => {
    const input = parseOrThrow(() => vendaInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await vendasService.create(input),
    });
  }),
);
