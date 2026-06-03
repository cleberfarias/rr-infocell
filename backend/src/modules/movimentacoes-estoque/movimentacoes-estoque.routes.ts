import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import {
  movimentacaoEstoqueInputSchema,
  movimentacaoEstoqueSearchSchema,
} from "./movimentacoes-estoque.schemas.js";
import { movimentacoesEstoqueService } from "./movimentacoes-estoque.service.js";

export const movimentacoesEstoqueRoutes = Router();

// Fase 9.10: resolveTenant popula request.tenantId a partir de usuarios/{uid}.
// Movimentações automáticas geradas por OS chamam o service diretamente (sem rota),
// usando DEFAULT_TENANT_ID como default — comportamento preservado.
movimentacoesEstoqueRoutes.use(resolveTenant);

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

movimentacoesEstoqueRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const { produtoId, tipo } = parseOrThrow(() =>
      movimentacaoEstoqueSearchSchema.parse(request.query),
    );
    const movimentacoes = await movimentacoesEstoqueService.list(
      {
        produtoId,
        tipo,
      },
      tenantId,
    );

    response.status(httpStatus.ok).json({
      data: movimentacoes,
      meta: {
        produtoId,
        tipo,
        total: movimentacoes.length,
      },
    });
  }),
);

movimentacoesEstoqueRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const input = parseOrThrow(() => movimentacaoEstoqueInputSchema.parse(request.body));

    response.status(httpStatus.created).json({
      data: await movimentacoesEstoqueService.create(input, tenantId),
    });
  }),
);
