import { apiBaseUrl, apiRequest } from "./api";
import { firebaseAuth } from "@/lib/firebase";

export type ObservabilidadeEvento = {
  id: string;
  tipo: "backend_log" | "request" | "frontend_error" | "process_error";
  nivel: "log" | "info" | "warn" | "error";
  mensagem: string;
  detalhes?: unknown;
  criadoEm: string;
};

export type ObservabilidadeSnapshot = {
  status: {
    backend: string;
    nodeEnv: string;
    uptimeSegundos: number;
    iniciadoEm: string;
    memoriaMb: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    whatsapp: {
      status: string;
      diagnostico?: Record<string, unknown>;
    };
  };
  eventos: ObservabilidadeEvento[];
  totais: {
    eventos: number;
    erros: number;
    avisos: number;
  };
};

export const getObservabilidadeSnapshot = () =>
  apiRequest<ObservabilidadeSnapshot>("/observabilidade/snapshot");

export const reportFrontendError = async (input: {
  mensagem: string;
  stack?: string;
  componentStack?: string;
}) => {
  const token = await firebaseAuth?.currentUser?.getIdToken();

  await fetch(`${apiBaseUrl}/observabilidade/eventos/frontend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...input,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => undefined);
};
