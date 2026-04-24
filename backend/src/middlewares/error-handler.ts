import type { ErrorRequestHandler } from "express";

import { AppError } from "../shared/errors.js";
import { httpStatus } from "../shared/http-status.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
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
