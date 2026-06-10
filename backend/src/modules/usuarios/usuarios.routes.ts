import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { auth } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
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
  (request as AuthenticatedRequest).user = decodedToken;

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
usuariosRoutes.use(resolveTenant);

usuariosRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const usuarios = await usuariosService.list(tenantId);

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
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => usuarioInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await usuariosService.create(input, tenantId),
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

usuariosRoutes.delete(
  "/:uid",
  asyncHandler(async (request, response) => {
    const uid = String(request.params.uid);
    await usuariosService.delete(uid);
    response.status(204).send();
  }),
);
