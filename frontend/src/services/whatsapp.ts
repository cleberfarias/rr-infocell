import { apiRequest } from "./api";
import type { Cliente } from "./clientes";
import type { OrdemServico } from "./ordens-servico";

export type TipoMensagem =
  | "texto"
  | "imagem"
  | "audio"
  | "video"
  | "documento"
  | "sticker"
  | "contato"
  | "localizacao"
  | "orcamento"
  | "status"
  | "pagamento";

export type StatusAtendimento = "aberto" | "em_atendimento" | "finalizado";
export type StatusEnvio = "enviado" | "entregue" | "lido" | "falhou";

export type Mensagem = {
  id: string;
  telefone: string;
  clienteId: string | null;
  de: "cliente" | "atendente" | "sistema";
  texto: string;
  tipo: TipoMensagem;
  midiaUrl?: string;
  midiaMimeType?: string;
  midiaNome?: string;
  midiaTamanho?: number;
  waMessageId?: string;
  statusEnvio?: StatusEnvio;
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
  statusAtendimento?: StatusAtendimento;
  atendenteResponsavel?: string | null;
  notasInternas?: string;
  arquivada?: boolean;
};

export type ConversaDetalhe = {
  mensagens: Mensagem[];
  cliente: Cliente | null;
  ordensAtivas: OrdemServico[];
};

export const getStatusWhatsApp = () =>
  apiRequest<{ status: string }>("/whatsapp/status");

export const getQRCode = () => apiRequest<{ qr: string }>("/whatsapp/qrcode");

export const listarConversas = () =>
  apiRequest<Conversa[]>("/whatsapp/conversas");

export const getConversa = (telefone: string) =>
  apiRequest<ConversaDetalhe>(`/whatsapp/conversas/${telefone}`);

export const enviarMensagem = (telefone: string, texto: string) =>
  apiRequest<{ ok: boolean }>("/whatsapp/enviar", {
    method: "POST",
    body: JSON.stringify({ telefone, texto }),
  });

export const enviarMidia = (
  telefone: string,
  arquivo: {
    base64: string;
    mimeType: string;
    nomeArquivo: string;
    legenda?: string;
  },
) =>
  apiRequest<{ ok: boolean }>("/whatsapp/enviar-midia", {
    method: "POST",
    body: JSON.stringify({ telefone, ...arquivo }),
  });

export const atualizarConversa = (
  telefone: string,
  dados: {
    statusAtendimento?: StatusAtendimento;
    atendenteResponsavel?: string | null;
    notasInternas?: string;
    arquivada?: boolean;
  },
) =>
  apiRequest<{ ok: boolean }>(`/whatsapp/conversas/${telefone}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });

export const enviarOrcamento = (osId: string) =>
  apiRequest<{ ok: boolean }>("/whatsapp/acoes/enviar-orcamento", {
    method: "POST",
    body: JSON.stringify({ osId }),
  });

export const informarPronto = (osId: string) =>
  apiRequest<{ ok: boolean }>("/whatsapp/acoes/informar-pronto", {
    method: "POST",
    body: JSON.stringify({ osId }),
  });

export const confirmarPagamento = (
  osId: string,
  formaPagamento: "pix" | "cartao" | "dinheiro",
  valorRecebido: number,
) =>
  apiRequest<{ ok: boolean }>("/whatsapp/acoes/confirmar-pagamento", {
    method: "POST",
    body: JSON.stringify({ osId, formaPagamento, valorRecebido }),
  });

export const enviarStatus = (osId: string) =>
  apiRequest<{ ok: boolean }>("/whatsapp/acoes/enviar-status", {
    method: "POST",
    body: JSON.stringify({ osId }),
  });

export type MensagemTemplate = {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  mensagem: string;
  variaveis: string[];
  tipo: "automatica" | "manual";
};

export const getConfiguracoesMensagens = () =>
  apiRequest<MensagemTemplate[]>("/whatsapp/configuracoes/mensagens");

export const saveConfiguracoesMensagens = (
  templates: Pick<MensagemTemplate, "id" | "ativo" | "mensagem">[],
) =>
  apiRequest<{ ok: boolean }>("/whatsapp/configuracoes/mensagens", {
    method: "PUT",
    body: JSON.stringify({ templates }),
  });
