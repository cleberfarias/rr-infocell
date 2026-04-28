import { Router } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { clienteInputSchema, clienteSearchSchema } from "./clientes.schemas.js";
import { clientesService } from "./clientes.service.js";

export const clientesRoutes = Router();

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

clientesRoutes.get("/", (request, response) => {
  const { q } = parseOrThrow(() => clienteSearchSchema.parse(request.query));
  const clientes = clientesService.list(q);

  response.status(httpStatus.ok).json({
    data: clientes,
    meta: {
      total: clientes.length,
      query: q,
    },
  });
});

clientesRoutes.get("/:id", (request, response) => {
  response.status(httpStatus.ok).json({
    data: clientesService.getById(request.params.id),
  });
});

clientesRoutes.post("/", (request, response) => {
  const input = parseOrThrow(() => clienteInputSchema.parse(request.body));

  response.status(httpStatus.created).json({
    data: clientesService.create(input),
  });
});

clientesRoutes.put("/:id", (request, response) => {
  const input = parseOrThrow(() => clienteInputSchema.parse(request.body));

  response.status(httpStatus.ok).json({
    data: clientesService.update(request.params.id, input),
  });
});

clientesRoutes.delete("/:id", (request, response) => {
  clientesService.delete(request.params.id);

  response.status(204).send();
});
