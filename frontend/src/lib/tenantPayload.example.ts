import {
  getTenantScopedPayload,
  hasTenantId,
  type TenantScopedPayload,
  type WithTenantId,
} from "@/lib/tenantPayload";

type TenantPayloadSandboxInput = {
  description: string;
  enabled: boolean;
};

type TenantPayloadSandboxPayload = WithTenantId<TenantPayloadSandboxInput>;

export const buildTenantPayloadSandboxExample =
  (): TenantPayloadSandboxPayload => {
    return getTenantScopedPayload({
      description: "Exemplo isolado de payload com tenant para staging.",
      enabled: true,
    });
  };

export const validateTenantPayloadSandboxExample = (
  payload: unknown,
): TenantScopedPayload => {
  if (!hasTenantId(payload)) {
    throw new Error("Payload sem tenantId.");
  }

  return payload;
};

export const isTenantPayloadSandboxExample = (
  payload: unknown,
): payload is TenantPayloadSandboxPayload => {
  return hasTenantId(payload);
};
