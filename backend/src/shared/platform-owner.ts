import { env } from "../config/env.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

const separarLista = (valor?: string) =>
  (valor ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const platformOwnerEmails = separarLista(env.OBSERVABILIDADE_ALLOWED_EMAILS);
export const platformOwnerUids = separarLista(env.OBSERVABILIDADE_ALLOWED_UIDS);

export const isPlatformOwner = (request: AuthenticatedRequest) => {
  const uid = request.user?.uid?.toLowerCase();
  const email = request.user?.email?.toLowerCase();

  return Boolean(
    (email && platformOwnerEmails.includes(email)) ||
      (uid && platformOwnerUids.includes(uid)),
  );
};
