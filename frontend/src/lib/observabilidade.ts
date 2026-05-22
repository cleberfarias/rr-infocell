import type { User } from "firebase/auth";
import { getOwnerSession, OWNER_EMAIL } from "@/lib/owner";

const separarLista = (valor: unknown) =>
  String(valor ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const emailsPermitidos = separarLista(import.meta.env.VITE_OBSERVABILIDADE_ALLOWED_EMAILS);
const uidsPermitidos = separarLista(import.meta.env.VITE_OBSERVABILIDADE_ALLOWED_UIDS);
const emailsComAcesso = emailsPermitidos.length > 0 ? emailsPermitidos : [OWNER_EMAIL.toLowerCase()];

export const canAccessObservabilidade = (user: User | null, isDevelopmentMode: boolean) => {
  if (isDevelopmentMode) {
    return getOwnerSession();
  }

  const email = user?.email?.toLowerCase();
  const uid = user?.uid?.toLowerCase();

  return Boolean(
    (email && emailsComAcesso.includes(email)) ||
      (uid && uidsPermitidos.includes(uid)),
  );
};
