import { Router, type NextFunction, type Request, type Response } from "express";
import { db } from "../../firebase/admin.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { decryptSecrets, encryptSecrets } from "./integracoes.crypto.js";
import { fiscalSettingsSchema, mercadoPagoOrderSchema, paymentSettingsSchema } from "./integracoes.schemas.js";
import { createAuthorizationUrl, listTerminals, testMercadoPago } from "./mercado-pago.service.js";
import { cancelPaymentTransaction, createPaymentTransaction, syncPaymentTransaction } from "./payment-transactions.service.js";

export const integracoesRoutes = Router();
integracoesRoutes.use(resolveTenant);
const asyncHandler = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
const requireDb = () => { if (!db) throw new AppError("firebase_not_configured", "Firebase Admin SDK nao esta configurado.", httpStatus.internalServerError); return db; };
const secretFields = ["certificadoPfxBase64", "senhaCertificado", "csc", "cscId", "clientId", "clientSecret", "merchantId", "accessToken"] as const;
async function saveSecrets(tenantId: string, kind: "fiscal" | "payment", incoming: Record<string, string>) {
  const ref = requireDb().collection("tenantIntegrationSecrets").doc(`${tenantId}_${kind}`);
  const existingSnap = await ref.get();
  const existingEncrypted = existingSnap.data()?.encrypted as { iv: string; tag: string; data: string } | undefined;
  const existing = existingEncrypted ? decryptSecrets(existingEncrypted) : {};
  const merged = { ...existing, ...incoming };
  await ref.set({ encrypted: encryptSecrets(merged), updatedAt: new Date().toISOString() }, { merge: true });
  return Object.keys(merged);
}

integracoesRoutes.get("/settings", asyncHandler(async (request, response) => {
  const tenantId = getRequestTenantId(request as TenantRequest);
  const snap = await requireDb().collection("tenantIntegrations").doc(tenantId).get();
  response.status(httpStatus.ok).json({ data: snap.exists ? snap.data() : { fiscal: null, payment: null } });
}));

integracoesRoutes.post("/mercado-pago/oauth/start", asyncHandler(async (request, response) => {
  const tenantId = getRequestTenantId(request as TenantRequest);
  response.status(httpStatus.ok).json({ data: { authorizationUrl: await createAuthorizationUrl(tenantId) } });
}));

integracoesRoutes.get("/mercado-pago/terminals", asyncHandler(async (request, response) => {
  const tenantId = getRequestTenantId(request as TenantRequest);
  response.status(httpStatus.ok).json({ data: await listTerminals(tenantId) });
}));

integracoesRoutes.post("/mercado-pago/orders", asyncHandler(async (request, response) => {
  const parsed = mercadoPagoOrderSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError("validation_error", parsed.error.errors[0]?.message ?? "Cobranca invalida.", httpStatus.badRequest);
  const tenantId = getRequestTenantId(request as TenantRequest);
  response.status(httpStatus.created).json({ data: await createPaymentTransaction(tenantId, parsed.data) });
}));

integracoesRoutes.get("/mercado-pago/orders/:id", asyncHandler(async (request, response) => {
  const tenantId = getRequestTenantId(request as TenantRequest);
  response.status(httpStatus.ok).json({ data: await syncPaymentTransaction(tenantId, String(request.params.id)) });
}));

integracoesRoutes.post("/mercado-pago/orders/:id/cancel", asyncHandler(async (request, response) => {
  const tenantId = getRequestTenantId(request as TenantRequest);
  response.status(httpStatus.ok).json({ data: await cancelPaymentTransaction(tenantId, String(request.params.id)) });
}));

integracoesRoutes.put("/fiscal", asyncHandler(async (request, response) => {
  const parsed = fiscalSettingsSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError("validation_error", parsed.error.errors[0]?.message ?? "Configuracao fiscal invalida.", httpStatus.badRequest);
  const tenantId = getRequestTenantId(request as TenantRequest);
  const input = parsed.data as Record<string, unknown>;
  const secrets: Record<string, string> = {};
  for (const field of secretFields) if (typeof input[field] === "string" && input[field]) { secrets[field] = input[field] as string; delete input[field]; }
  const existing = await requireDb().collection("tenantIntegrations").doc(tenantId).get();
  const configured = Object.keys(secrets).length ? await saveSecrets(tenantId, "fiscal", secrets) : (existing.data()?.fiscal?.secretsConfigured ?? []);
  const fiscal = { ...input, secretsConfigured: configured, updatedAt: new Date().toISOString() };
  await requireDb().collection("tenantIntegrations").doc(tenantId).set({ fiscal }, { merge: true });
  response.status(httpStatus.ok).json({ data: fiscal });
}));

integracoesRoutes.put("/payment", asyncHandler(async (request, response) => {
  const parsed = paymentSettingsSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError("validation_error", parsed.error.errors[0]?.message ?? "Configuracao de pagamento invalida.", httpStatus.badRequest);
  const tenantId = getRequestTenantId(request as TenantRequest);
  const input = parsed.data as Record<string, unknown>;
  const secrets: Record<string, string> = {};
  for (const field of secretFields) if (typeof input[field] === "string" && input[field]) { secrets[field] = input[field] as string; delete input[field]; }
  const existing = await requireDb().collection("tenantIntegrations").doc(tenantId).get();
  const currentPayment = existing.data()?.payment ?? {};
  const configured = Object.keys(secrets).length ? await saveSecrets(tenantId, "payment", secrets) : (currentPayment.secretsConfigured ?? []);
  const payment = { ...currentPayment, ...input, secretsConfigured: configured, updatedAt: new Date().toISOString() };
  await requireDb().collection("tenantIntegrations").doc(tenantId).set({ payment }, { merge: true });
  response.status(httpStatus.ok).json({ data: payment });
}));

integracoesRoutes.post("/:kind/test", asyncHandler(async (request, response) => {
  const kind = request.params.kind;
  if (kind !== "fiscal" && kind !== "payment") throw new AppError("invalid_integration", "Integracao invalida.", httpStatus.badRequest);
  const tenantId = getRequestTenantId(request as TenantRequest);
  const snap = await requireDb().collection("tenantIntegrations").doc(tenantId).get();
  const settings = snap.data()?.[kind];
  if (!settings) throw new AppError("integration_not_configured", "Salve a configuracao antes de testar.", httpStatus.badRequest);
  if (kind === "payment" && settings.provider === "mercado_pago" && settings.oauthConnected) return response.status(httpStatus.ok).json({ data: await testMercadoPago(tenantId) });
  response.status(httpStatus.ok).json({ data: { ok: false, status: "pending_provider_adapter", message: "Configuracao validada. O teste externo sera habilitado com o adaptador do provedor." } });
}));
