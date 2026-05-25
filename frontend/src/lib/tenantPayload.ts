import { getCurrentTenantId } from "@/lib/tenant";
import type { TenantId } from "@/types/tenant";

export type TenantScopedPayload = {
  tenantId: TenantId;
};

export type WithTenantId<T extends object> = T & TenantScopedPayload;

export const withTenantId = <T extends object>(data: T): WithTenantId<T> => ({
  ...data,
  tenantId: getCurrentTenantId(),
});

export const getTenantScopedPayload = <T extends object>(
  data: T,
): WithTenantId<T> => withTenantId(data);

export const hasTenantId = (
  payload: unknown,
): payload is TenantScopedPayload => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "tenantId" in payload &&
    typeof (payload as { tenantId?: unknown }).tenantId === "string" &&
    (payload as { tenantId: string }).tenantId.trim().length > 0
  );
};

export const assertTenantId = (
  payload: unknown,
): asserts payload is TenantScopedPayload => {
  if (!hasTenantId(payload)) {
    throw new Error("Payload sem tenantId.");
  }
};
