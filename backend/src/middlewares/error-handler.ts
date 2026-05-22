import type { ErrorRequestHandler } from "express";

import { AppError } from "../shared/errors.js";
import { httpStatus } from "../shared/http-status.js";
import { observabilidadeService } from "../modules/observabilidade/observabilidade.service.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  observabilidadeService.registrarErroBackend(error, request);

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  console.error(error);

  return response.status(httpStatus.internalServerError).json({
    error: {
      code: "internal_error",
      message: "Erro interno do servidor.",
    },
  });
};
