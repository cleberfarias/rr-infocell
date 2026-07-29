import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";

const key = () => {
  if (!env.INTEGRATIONS_ENCRYPTION_KEY) {
    throw new AppError(
      "encryption_not_configured",
      "Configure INTEGRATIONS_ENCRYPTION_KEY no backend antes de salvar credenciais.",
      httpStatus.internalServerError,
    );
  }
  return createHash("sha256").update(env.INTEGRATIONS_ENCRYPTION_KEY).digest();
};

export function encryptSecrets(value: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptSecrets(payload: { iv: string; tag: string; data: string }) {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(payload.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  ) as Record<string, string>;
}
