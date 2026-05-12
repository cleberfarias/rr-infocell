import { firebaseAuth } from "@/lib/firebase";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

export const apiRequest = async <T>(path: string, init?: RequestInit) => {
  const token = await firebaseAuth?.currentUser?.getIdToken();
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
