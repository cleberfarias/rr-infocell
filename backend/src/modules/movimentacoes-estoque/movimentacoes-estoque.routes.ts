import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import {
  movimentacaoEstoqueInputSchema,
  movimentacaoEstoqueSearchSchema,
} from "./movimentacoes-estoque.schemas.js";
import { movimentacoesEstoqueService } from "./movimentacoes-estoque.service.js";

export const movimentacoesEstoqueRoutes = Router();

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

movimentacoesEstoqueRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const { produtoId, tipo } = parseOrThrow(() =>
      movimentacaoEstoqueSearchSchema.parse(request.query),
    );
    const movimentacoes = await movimentacoesEstoqueService.list({
      produtoId,
      tipo,
    });

    response.status(httpStatus.ok).json({
      data: movimentacoes,
      meta: {
        produtoId,
        tipo,
        total: movimentacoes.length,
      },
    });
  }),
);

movimentacoesEstoqueRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() =>
      movimentacaoEstoqueInputSchema.parse(request.body),
    );

    response.status(httpStatus.created).json({
      data: await movimentacoesEstoqueService.create(input),
    });
  }),
);
