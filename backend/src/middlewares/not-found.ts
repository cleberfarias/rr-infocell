import type { RequestHandler } from "express";

import { httpStatus } from "../shared/http-status.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(httpStatus.notFound).json({
    error: {
      code: "route_not_found",
      message: `Rota ${request.method} ${request.path} nao encontrada.`,
    },
  });
};
