export type IntegrationTestResult = { ok: boolean; code: string; message: string };

export interface FiscalProvider {
  testConnection(tenantId: string): Promise<IntegrationTestResult>;
  issueNfce(tenantId: string, vendaId: string): Promise<{ documentId: string; status: string }>;
  issueNfse(tenantId: string, vendaId: string): Promise<{ documentId: string; status: string }>;
  cancel(tenantId: string, documentId: string, reason: string): Promise<void>;
}

export interface PaymentProvider {
  testConnection(tenantId: string): Promise<IntegrationTestResult>;
  createCharge(
    tenantId: string,
    vendaId: string,
    amount: number,
  ): Promise<{ chargeId: string; status: string }>;
  getCharge(tenantId: string, chargeId: string): Promise<{ chargeId: string; status: string }>;
  refund(tenantId: string, chargeId: string, amount?: number): Promise<void>;
}
