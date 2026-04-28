import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { clienteInputSchema, clienteSearchSchema } from "./clientes.schemas.js";
import { clientesService } from "./clientes.service.js";

export const clientesRoutes = Router();

type AsyncRouteHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

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

clientesRoutes.get("/", asyncHandler(async (request, response) => {
  const { q } = parseOrThrow(() => clienteSearchSchema.parse(request.query));
  const clientes = await clientesService.list(q);

  response.status(httpStatus.ok).json({
    data: clientes,
    meta: {
      total: clientes.length,
      query: q,
    },
  });
}));

clientesRoutes.get("/:id", asyncHandler(async (request, response) => {
  const id = String(request.params.id);

  response.status(httpStatus.ok).json({
    data: await clientesService.getById(id),
  });
}));

clientesRoutes.post("/", asyncHandler(async (request, response) => {
  const input = parseOrThrow(() => clienteInputSchema.parse(request.body));

  response.status(httpStatus.created).json({
    data: await clientesService.create(input),
  });
}));

clientesRoutes.put("/:id", asyncHandler(async (request, response) => {
  const id = String(request.params.id);
  const input = parseOrThrow(() => clienteInputSchema.parse(request.body));

  response.status(httpStatus.ok).json({
    data: await clientesService.update(id, input),
  });
}));

clientesRoutes.delete("/:id", asyncHandler(async (request, response) => {
  const id = String(request.params.id);

  await clientesService.delete(id);

  response.status(204).send();
}));
