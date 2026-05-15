import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { auth } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { usuarioInputSchema, usuarioUpdateSchema } from "./usuarios.schemas.js";
import { usuariosService } from "./usuarios.service.js";

export const usuariosRoutes = Router();

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

const requireAdmin = asyncHandler(async (request, _response, next) => {
  if (!auth) {
    throw new AppError(
      "firebase_auth_not_configured",
      "Firebase Auth Admin SDK nao esta configurado.",
      httpStatus.internalServerError,
    );
  }

  const authorization = request.header("authorization") ?? "";
  const [, token] = authorization.match(/^Bearer (.+)$/i) ?? [];

  if (!token) {
    throw new AppError(
      "missing_token",
      "Token Firebase Auth nao informado.",
      httpStatus.unauthorized,
    );
  }

  const decodedToken = await auth.verifyIdToken(token);

  if (decodedToken.role !== "admin") {
    throw new AppError(
      "forbidden",
      "Apenas administradores podem gerenciar usuarios.",
      httpStatus.forbidden,
    );
  }

  next();
});

usuariosRoutes.use(requireAdmin);

usuariosRoutes.get(
  "/",
  asyncHandler(async (_request, response) => {
    const usuarios = await usuariosService.list();

    response.status(httpStatus.ok).json({
      data: usuarios,
      meta: {
        total: usuarios.length,
      },
    });
  }),
);

usuariosRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = parseOrThrow(() => usuarioInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await usuariosService.create(input),
    });
  }),
);

usuariosRoutes.put(
  "/:uid",
  asyncHandler(async (request, response) => {
    const uid = String(request.params.uid);
    const input = parseOrThrow(() => usuarioUpdateSchema.parse(request.body));

    response.status(httpStatus.ok).json({
      data: await usuariosService.update(uid, input),
    });
  }),
);
