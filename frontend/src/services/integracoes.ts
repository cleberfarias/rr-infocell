import { apiRequest } from "@/services/api";

export type FiscalSettings = { uf: string; ambiente: "homologacao" | "producao"; regimeTributario: "simples_nacional" | "simples_excesso" | "regime_normal"; emiteNfce: boolean; emiteNfse: boolean; municipio?: string; provedorNfse?: string; serieNfce: number; proximoNumeroNfce: number; secretsConfigured?: string[] };
export type PaymentSettings = { provider: "stone" | "mercado_pago" | "pagbank" | "cielo" | "rede"; mode: "api" | "smartpos" | "tef"; terminalId?: string; secretsConfigured?: string[]; oauthConnected?: boolean; mercadoPagoUserId?: string; liveMode?: boolean };
export const getIntegrationSettings = () => apiRequest<{ data: { fiscal: FiscalSettings | null; payment: PaymentSettings | null } }>("/integracoes/settings").then((r) => r.data);
export const saveFiscalSettings = (input: FiscalSettings & Record<string, unknown>) => apiRequest<{ data: FiscalSettings }>("/integracoes/fiscal", { method: "PUT", body: JSON.stringify(input) }).then((r) => r.data);
export const savePaymentSettings = (input: PaymentSettings & Record<string, unknown>) => apiRequest<{ data: PaymentSettings }>("/integracoes/payment", { method: "PUT", body: JSON.stringify(input) }).then((r) => r.data);
export const testIntegration = (kind: "fiscal" | "payment") => apiRequest<{ data: { ok: boolean; message: string } }>(`/integracoes/${kind}/test`, { method: "POST" }).then((r) => r.data);
export const startMercadoPagoOAuth = () => apiRequest<{ data: { authorizationUrl: string } }>("/integracoes/mercado-pago/oauth/start", { method: "POST" }).then((r) => r.data);
export const listMercadoPagoTerminals = () => apiRequest<{ data: { terminals?: Array<{ id?: string; operating_mode?: string; pos_id?: string }> } }>("/integracoes/mercado-pago/terminals").then((r) => r.data);
export type PaymentTransaction = { id: string; providerOrderId: string; reference: string; terminalId: string; amount: number; status: "pending" | "approved" | "failed" | "canceled" | "expired"; providerStatus: string };
export const createMercadoPagoOrder = (input: { terminalId: string; amount: number; description: string; reference: string }) => apiRequest<{ data: PaymentTransaction }>("/integracoes/mercado-pago/orders", { method: "POST", body: JSON.stringify(input) }).then((r) => r.data);
export const getMercadoPagoOrder = (id: string) => apiRequest<{ data: PaymentTransaction }>(`/integracoes/mercado-pago/orders/${id}`).then((r) => r.data);
export const cancelMercadoPagoOrder = (id: string) => apiRequest<{ data: PaymentTransaction }>(`/integracoes/mercado-pago/orders/${id}/cancel`, { method: "POST" }).then((r) => r.data);
