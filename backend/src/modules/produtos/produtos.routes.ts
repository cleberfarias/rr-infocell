import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { produtoInputSchema, produtoSearchSchema } from "./produtos.schemas.js";
import { produtosService } from "./produtos.service.js";

export const produtosRoutes = Router();

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

produtosRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const { q, categoria, ativo } = parseOrThrow(() =>
      produtoSearchSchema.parse(request.query),
    );
    const produtos = await produtosService.list({
      ativo: ativo === "" ? "" : ativo === "true",
      categoria,
      search: q,
    });

    const page = Math.max(1, parseInt(request.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit as string) || 50));
    const total = produtos.length;
    const totalPages = Math.ceil(total / limit);
    const data = produtos.slice((page - 1) * limit, page * limit);

    response.status(httpStatus.ok).json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        ativo,
        categoria,
        query: q,
      },
    });
  }),
);

produtosRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await produtosService.getById(id),
    });
  }),
);

produtosRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => produtoInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await produtosService.create(input),
    });
  }),
);

produtosRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);
    const input = parseOrThrow(() => produtoInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await produtosService.update(id, input),
    });
  }),
);

produtosRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    await produtosService.delete(id);

    response.status(204).send();
  }),
);
