import type { NextFunction, Request, Response } from "express";

import { observabilidadeService } from "./observabilidade.service.js";

export const observabilidadeRequestLogger = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const inicio = Date.now();

  response.on("finish", () => {
    observabilidadeService.registrarRequest(request, response, Date.now() - inicio);
  });

  next();
};
