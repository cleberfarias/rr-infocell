import { createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { decryptSecrets, encryptSecrets } from "./integracoes.crypto.js";

type OAuthToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
  scope?: string;
  live_mode?: boolean;
};
const MP_API = "https://api.mercadopago.com";
const stateId = (state: string) => createHash("sha256").update(state).digest("hex");
const base64url = (value: Buffer) => value.toString("base64url");

function config() {
  if (
    !env.MERCADO_PAGO_CLIENT_ID ||
    !env.MERCADO_PAGO_CLIENT_SECRET ||
    !env.MERCADO_PAGO_OAUTH_REDIRECT_URI
  ) {
    throw new AppError(
      "mercado_pago_not_configured",
      "Configure as credenciais OAuth da plataforma Mercado Pago.",
      httpStatus.internalServerError,
    );
  }
  return {
    clientId: env.MERCADO_PAGO_CLIENT_ID,
    clientSecret: env.MERCADO_PAGO_CLIENT_SECRET,
    redirectUri: env.MERCADO_PAGO_OAUTH_REDIRECT_URI,
  };
}

function firestore() {
  if (!db)
    throw new AppError(
      "firebase_not_configured",
      "Firebase Admin SDK nao esta configurado.",
      httpStatus.internalServerError,
    );
  return db;
}

async function parseResponse<T>(response: globalThis.Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok)
    throw new AppError(
      "mercado_pago_error",
      String(body.message ?? body.error ?? "Falha na comunicacao com Mercado Pago."),
      httpStatus.badRequest,
    );
  return body as T;
}

async function saveTokens(tenantId: string, token: OAuthToken) {
  const ref = firestore().collection("tenantIntegrationSecrets").doc(`${tenantId}_payment`);
  const snap = await ref.get();
  const encrypted = snap.data()?.encrypted as { iv: string; tag: string; data: string } | undefined;
  const existing = encrypted ? decryptSecrets(encrypted) : {};
  const secrets = {
    ...existing,
    mercadoPagoAccessToken: token.access_token,
    mercadoPagoRefreshToken: token.refresh_token,
    mercadoPagoExpiresAt: String(Date.now() + token.expires_in * 1000),
  };
  await ref.set(
    { encrypted: encryptSecrets(secrets), updatedAt: new Date().toISOString() },
    { merge: true },
  );
  await firestore()
    .collection("tenantIntegrations")
    .doc(tenantId)
    .set(
      {
        payment: {
          provider: "mercado_pago",
          mode: "api",
          oauthConnected: true,
          mercadoPagoUserId: String(token.user_id),
          liveMode: Boolean(token.live_mode),
          scopes: token.scope ?? "",
          connectedAt: new Date().toISOString(),
          secretsConfigured: ["mercadoPagoOAuth"],
        },
      },
      { merge: true },
    );
}

export async function getMercadoPagoAccessToken(tenantId: string) {
  const ref = firestore().collection("tenantIntegrationSecrets").doc(`${tenantId}_payment`);
  const snap = await ref.get();
  const encrypted = snap.data()?.encrypted as { iv: string; tag: string; data: string } | undefined;
  if (!encrypted)
    throw new AppError(
      "mercado_pago_not_connected",
      "Conecte a conta Mercado Pago deste tenant.",
      httpStatus.badRequest,
    );
  const secrets = decryptSecrets(encrypted);
  const expiresAt = Number(secrets.mercadoPagoExpiresAt ?? 0);
  if (expiresAt > Date.now() + 300_000) return secrets.mercadoPagoAccessToken;
  if (!secrets.mercadoPagoRefreshToken)
    throw new AppError(
      "mercado_pago_reconnect_required",
      "Reconecte a conta Mercado Pago.",
      httpStatus.badRequest,
    );
  const cfg = config();
  const response = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: secrets.mercadoPagoRefreshToken,
    }),
  });
  const token = await parseResponse<OAuthToken>(response);
  await saveTokens(tenantId, token);
  return token.access_token;
}

export async function createAuthorizationUrl(tenantId: string) {
  const cfg = config();
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  await firestore()
    .collection("integrationOAuthStates")
    .doc(stateId(state))
    .set({
      tenantId,
      provider: "mercado_pago",
      verifier: encryptSecrets({ verifier }),
      expiresAt: Date.now() + 10 * 60_000,
      consumed: false,
      createdAt: new Date().toISOString(),
    });
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: cfg.redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export async function completeAuthorization(code: string, state: string) {
  const ref = firestore().collection("integrationOAuthStates").doc(stateId(state));
  const snap = await ref.get();
  const data = snap.data();
  if (
    !snap.exists ||
    data?.provider !== "mercado_pago" ||
    data?.consumed ||
    Number(data?.expiresAt ?? 0) < Date.now()
  )
    throw new AppError(
      "invalid_oauth_state",
      "Autorizacao OAuth invalida ou expirada.",
      httpStatus.badRequest,
    );
  await ref.update({ consumed: true, consumedAt: new Date().toISOString() });
  const verifier = decryptSecrets(
    data?.verifier as { iv: string; tag: string; data: string },
  ).verifier;
  const cfg = config();
  const response = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
      code_verifier: verifier,
    }),
  });
  const token = await parseResponse<OAuthToken>(response);
  await saveTokens(String(data?.tenantId), token);
  await ref.delete();
  return String(data?.tenantId);
}

export async function listTerminals(tenantId: string) {
  const accessToken = await getMercadoPagoAccessToken(tenantId);
  const response = await fetch(`${MP_API}/terminals/v1/list`, {
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
  });
  return parseResponse<Record<string, unknown>>(response);
}

export type MercadoPagoPointOrder = {
  id: string;
  status: string;
  status_detail?: string;
  external_reference: string;
  transactions?: {
    payments?: Array<{ id?: string; amount?: string; status?: string; status_detail?: string }>;
  };
};

export async function createPointOrder(
  tenantId: string,
  input: {
    terminalId: string;
    amount: number;
    description: string;
    reference: string;
    idempotencyKey: string;
  },
) {
  const accessToken = await getMercadoPagoAccessToken(tenantId);
  const response = await fetch(`${MP_API}/v1/orders`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      "x-idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      type: "point",
      external_reference: input.reference,
      expiration_time: "PT16M",
      transactions: { payments: [{ amount: input.amount.toFixed(2) }] },
      config: { point: { terminal_id: input.terminalId, print_on_terminal: "no_ticket" } },
      description: input.description,
    }),
  });
  return parseResponse<MercadoPagoPointOrder>(response);
}

export async function getPointOrder(tenantId: string, orderId: string) {
  const accessToken = await getMercadoPagoAccessToken(tenantId);
  const response = await fetch(`${MP_API}/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
  });
  return parseResponse<MercadoPagoPointOrder>(response);
}

export async function cancelPointOrder(tenantId: string, orderId: string, idempotencyKey: string) {
  const accessToken = await getMercadoPagoAccessToken(tenantId);
  const response = await fetch(`${MP_API}/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "x-idempotency-key": idempotencyKey,
    },
  });
  return parseResponse<MercadoPagoPointOrder>(response);
}

export async function testMercadoPago(tenantId: string) {
  const terminals = await listTerminals(tenantId);
  const list = Array.isArray(terminals.terminals)
    ? terminals.terminals
    : Array.isArray(terminals.data)
      ? terminals.data
      : [];
  return { ok: true, message: "Conta Mercado Pago conectada.", terminals: list };
}
