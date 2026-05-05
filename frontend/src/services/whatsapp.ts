import type { Cliente } from "./clientes";
import type { OrdemServico } from "./ordens-servico";

export type TipoMensagem = "texto" | "imagem" | "audio" | "video" | "orcamento" | "status" | "pagamento";

export type Mensagem = {
  id: string;
  telefone: string;
  clienteId: string | null;
  de: "cliente" | "atendente" | "sistema";
  texto: string;
  tipo: TipoMensagem;
  midiaUrl?: string;
  timestamp: string;
  lida: boolean;
};

export type Conversa = {
  telefone: string;
  clienteId: string | null;
  nome: string;
  ultimaMensagem: string;
  ultimaInteracao: string;
  naoLidas: number;
  aguardandoAprovacao: boolean;
  osIdPendente: string | null;
};

export type ConversaDetalhe = {
  mensagens: Mensagem[];
  cliente: Cliente | null;
  ordensAtivas: OrdemServico[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "Erro na requisicao.");
  }
  return res.json() as Promise<T>;
};

export const getStatusWhatsApp = () =>
  request<{ status: string }>("/whatsapp/status");

export const getQRCode = () =>
  request<{ qr: string }>("/whatsapp/qrcode");

export const listarConversas = () =>
  request<Conversa[]>("/whatsapp/conversas");

export const getConversa = (telefone: string) =>
  request<ConversaDetalhe>(`/whatsapp/conversas/${telefone}`);

export const enviarMensagem = (telefone: string, texto: string) =>
  request<{ ok: boolean }>("/whatsapp/enviar", {
    method: "POST",
    body: JSON.stringify({ telefone, texto }),
  });

export const enviarOrcamento = (osId: string) =>
  request<{ ok: boolean }>("/whatsapp/acoes/enviar-orcamento", {
    method: "POST",
    body: JSON.stringify({ osId }),
  });

export const informarPronto = (osId: string) =>
  request<{ ok: boolean }>("/whatsapp/acoes/informar-pronto", {
    method: "POST",
    body: JSON.stringify({ osId }),
  });

export const confirmarPagamento = (
  osId: string,
  formaPagamento: "pix" | "cartao" | "dinheiro",
  valorRecebido: number,
) =>
  request<{ ok: boolean }>("/whatsapp/acoes/confirmar-pagamento", {
    method: "POST",
    body: JSON.stringify({ osId, formaPagamento, valorRecebido }),
  });

export const enviarStatus = (osId: string) =>
  request<{ ok: boolean }>("/whatsapp/acoes/enviar-status", {
    method: "POST",
    body: JSON.stringify({ osId }),
  });
