import { Router, type NextFunction, type Response } from "express";

import { env } from "../../config/env.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { observabilidadeService } from "./observabilidade.service.js";

export const observabilidadeRoutes = Router();

const separarLista = (valor?: string) =>
  (valor ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const emailsPermitidos = separarLista(env.OBSERVABILIDADE_ALLOWED_EMAILS);
const uidsPermitidos = separarLista(env.OBSERVABILIDADE_ALLOWED_UIDS);

const requireDonoObservabilidade = (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) => {
  if (env.NODE_ENV !== "production" && !request.user) {
    next();
    return;
  }

  const uid = request.user?.uid?.toLowerCase();
  const email = request.user?.email?.toLowerCase();
  const permitidoPorUid = uid ? uidsPermitidos.includes(uid) : false;
  const permitidoPorEmail = email ? emailsPermitidos.includes(email) : false;

  if (!permitidoPorUid && !permitidoPorEmail) {
    next(
      new AppError(
        "observabilidade_forbidden",
        "Apenas o proprietario configurado pode acessar a observabilidade.",
        httpStatus.forbidden,
      ),
    );
    return;
  }

  next();
};

observabilidadeRoutes.post("/eventos/frontend", (request: AuthenticatedRequest, response) => {
  const body = request.body as {
    mensagem?: string;
    stack?: string;
    componentStack?: string;
    url?: string;
    userAgent?: string;
  };

  observabilidadeService.registrarErroFrontend({
    mensagem: body.mensagem?.trim() || "Erro frontend sem mensagem",
    stack: body.stack,
    componentStack: body.componentStack,
    url: body.url,
    userAgent: body.userAgent,
    usuario: request.user?.email ?? request.user?.uid ?? null,
  });

  response.status(204).send();
});

observabilidadeRoutes.get("/snapshot", requireDonoObservabilidade, (_request, response) => {
  response.json(observabilidadeService.getSnapshot());
});
