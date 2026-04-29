import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { ordemServicoInputSchema, ordemServicoSearchSchema } from "./ordens-servico.schemas.js";
import { ordensServicoService } from "./ordens-servico.service.js";

export const ordensServicoRoutes = Router();

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

ordensServicoRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const filters = parseOrThrow(() => ordemServicoSearchSchema.parse(request.query));
    const ordens = await ordensServicoService.list({
      search: filters.q,
      status: filters.status,
      clienteId: filters.clienteId,
      aparelhoId: filters.aparelhoId,
    });

    response.status(httpStatus.ok).json({
      data: ordens,
      meta: {
        total: ordens.length,
        query: filters.q,
        status: filters.status,
        clienteId: filters.clienteId,
        aparelhoId: filters.aparelhoId,
      },
    });
  }),
);

ordensServicoRoutes.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    response.status(httpStatus.ok).json({
      data: await ordensServicoService.getById(id),
    });
  }),
);

ordensServicoRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => ordemServicoInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await ordensServicoService.create(input),
    });
  }),
);

ordensServicoRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);
    const input = parseOrThrow(() => ordemServicoInputSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await ordensServicoService.update(id, input),
    });
  }),
);

ordensServicoRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = String(request.params.id);

    await ordensServicoService.delete(id);

    response.status(204).send();
  }),
);
