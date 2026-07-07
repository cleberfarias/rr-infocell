import { onAuthStateChanged, type User } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

const isDevelopmentAuthMode = import.meta.env.VITE_AUTH_DEV_MODE === "true";

const waitForFirebaseUser = () =>
  new Promise<User | null>((resolve) => {
    if (!firebaseAuth) {
      resolve(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      () => {
        unsubscribe();
        resolve(null);
      },
    );
  });

const getAuthToken = async () => {
  if (isDevelopmentAuthMode) {
    return null;
  }

  if (!firebaseAuth) {
    return null;
  }

  const user = firebaseAuth.currentUser ?? (await waitForFirebaseUser());

  if (!user) {
    throw new Error("Sessao Firebase Auth nao encontrada. Faca login novamente.");
  }

  return user.getIdToken();
};

export const apiRequest = async <T>(path: string, init?: RequestInit) => {
  const token = await getAuthToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    throw new Error(
      payload?.error?.message ?? "Nao foi possivel concluir a operacao.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
