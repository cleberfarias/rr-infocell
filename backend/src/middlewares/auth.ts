import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

import { env } from "../config/env.js";
import { auth } from "../firebase/admin.js";
import { AppError } from "../shared/errors.js";
import { httpStatus } from "../shared/http-status.js";

export type AuthenticatedRequest = Request & {
  user?: DecodedIdToken;
};

type Role = "admin" | "atendente" | "tecnico";

const shouldBypassAuth = () => env.NODE_ENV !== "production" && !auth;
const isAuthOptional = () => env.NODE_ENV !== "production";

export const requireAuth = async (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) => {
  try {
    if (shouldBypassAuth()) {
      next();
      return;
    }

    if (!auth) {
      throw new AppError(
        "firebase_auth_not_configured",
        "Firebase Auth Admin SDK nao esta configurado.",
        httpStatus.internalServerError,
      );
    }

    const authorization = request.header("authorization") ?? "";
    const [, token] = authorization.match(/^Bearer (.+)$/i) ?? [];

    if (!token && isAuthOptional()) {
      next();
      return;
    }

    if (!token) {
      throw new AppError(
        "missing_token",
        "Token Firebase Auth nao informado.",
        httpStatus.unauthorized,
      );
    }

    request.user = await auth.verifyIdToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: Role[]) => {
  return (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    if (shouldBypassAuth() || (isAuthOptional() && !request.user)) {
      next();
      return;
    }

    const role = request.user?.role;

    if (typeof role !== "string" || !roles.includes(role as Role)) {
      next(
        new AppError(
          "forbidden",
          "Usuario sem permissao para acessar este recurso.",
          httpStatus.forbidden,
        ),
      );
      return;
    }

    next();
  };
};
