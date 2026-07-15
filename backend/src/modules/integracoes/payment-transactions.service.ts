import { randomUUID } from "node:crypto";
import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import {
  cancelPointOrder,
  createPointOrder,
  getPointOrder,
  type MercadoPagoPointOrder,
} from "./mercado-pago.service.js";

const collection = "paymentTransactions";
type StoredPaymentTransaction = {
  id: string;
  tenantId: string;
  provider: string;
  providerOrderId: string;
  reference: string;
  terminalId: string;
  amount: number;
  status: string;
  providerStatus: string;
  providerStatusDetail: string;
  consumed: boolean;
  paymentId?: string | null;
  createdAt: string;
  updatedAt: string;
};
const firestore = () => {
  if (!db)
    throw new AppError(
      "firebase_not_configured",
      "Firebase Admin SDK nao esta configurado.",
      httpStatus.internalServerError,
    );
  return db;
};
const normalizedStatus = (order: MercadoPagoPointOrder) =>
  order.status === "processed"
    ? "approved"
    : order.status === "failed"
      ? "failed"
      : order.status === "canceled"
        ? "canceled"
        : order.status === "expired"
          ? "expired"
          : "pending";

export async function createPaymentTransaction(
  tenantId: string,
  input: { terminalId: string; amount: number; description: string; reference: string },
) {
  const id = randomUUID();
  const order = await createPointOrder(tenantId, { ...input, idempotencyKey: id });
  const transaction = {
    id,
    tenantId,
    provider: "mercado_pago",
    providerOrderId: order.id,
    reference: input.reference,
    terminalId: input.terminalId,
    amount: input.amount,
    status: normalizedStatus(order),
    providerStatus: order.status,
    providerStatusDetail: order.status_detail ?? "",
    consumed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await firestore().collection(collection).doc(id).set(transaction);
  return transaction;
}

export async function syncPaymentTransaction(
  tenantId: string,
  id: string,
): Promise<StoredPaymentTransaction> {
  const ref = firestore().collection(collection).doc(id);
  const snap = await ref.get();
  const current = snap.data() as StoredPaymentTransaction | undefined;
  if (!snap.exists || current?.tenantId !== tenantId)
    throw new AppError(
      "payment_transaction_not_found",
      "Transacao de pagamento nao encontrada.",
      httpStatus.notFound,
    );
  const order = await getPointOrder(tenantId, String(current?.providerOrderId));
  const update = {
    status: normalizedStatus(order),
    providerStatus: order.status,
    providerStatusDetail: order.status_detail ?? "",
    paymentId: order.transactions?.payments?.[0]?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(update, { merge: true });
  return { ...current, ...update, id } as StoredPaymentTransaction;
}

export async function cancelPaymentTransaction(tenantId: string, id: string) {
  const ref = firestore().collection(collection).doc(id);
  const snap = await ref.get();
  const current = snap.data();
  if (!snap.exists || current?.tenantId !== tenantId)
    throw new AppError(
      "payment_transaction_not_found",
      "Transacao de pagamento nao encontrada.",
      httpStatus.notFound,
    );
  await cancelPointOrder(tenantId, String(current?.providerOrderId), randomUUID());
  return syncPaymentTransaction(tenantId, id);
}

export async function requireApprovedPaymentTransaction(
  tenantId: string,
  id: string,
  minimumAmount: number,
) {
  const transaction = await syncPaymentTransaction(tenantId, id);
  if (transaction.status !== "approved")
    throw new AppError(
      "payment_not_approved",
      "O pagamento ainda nao foi aprovado no terminal.",
      httpStatus.badRequest,
    );
  if (transaction.consumed)
    throw new AppError(
      "payment_already_consumed",
      "Este pagamento ja foi vinculado a outra venda.",
      httpStatus.badRequest,
    );
  if (Number(transaction.amount) + 0.001 < minimumAmount)
    throw new AppError(
      "payment_amount_mismatch",
      "O valor aprovado e menor que o total da venda.",
      httpStatus.badRequest,
    );
  return transaction;
}

export async function consumePaymentTransaction(tenantId: string, id: string, vendaId: string) {
  const ref = firestore().collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.tenantId !== tenantId)
    throw new AppError(
      "payment_transaction_not_found",
      "Transacao de pagamento nao encontrada.",
      httpStatus.notFound,
    );
  await ref.set(
    {
      consumed: true,
      vendaId,
      consumedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
