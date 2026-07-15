import { Router, type NextFunction, type Request, type Response } from "express";
import { env } from "../../config/env.js";
import { completeAuthorization } from "./mercado-pago.service.js";

export const integracoesPublicRoutes = Router();
const asyncHandler = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

integracoesPublicRoutes.get("/mercado-pago/oauth/callback", asyncHandler(async (request, response) => {
  const code = typeof request.query.code === "string" ? request.query.code : "";
  const state = typeof request.query.state === "string" ? request.query.state : "";
  const denied = typeof request.query.error === "string";
  if (!code || !state || denied) return response.redirect(`${env.APP_URL}/app/configuracoes/integracoes?mercadoPago=denied`);
  await completeAuthorization(code, state);
  return response.redirect(`${env.APP_URL}/app/configuracoes/integracoes?mercadoPago=connected`);
}));
