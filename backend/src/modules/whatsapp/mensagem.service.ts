import { downloadMediaMessage, type WAMessage } from "@whiskeysockets/baileys";
import { getStorage } from "firebase-admin/storage";
import { db } from "../../firebase/admin.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { vincularCliente } from "./vinculo.service.js";
import { botService } from "./bot.service.js";

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

export type StatusEnvio = "enviado" | "entregue" | "lido" | "falhou";

export type StatusAtendimento = "aberto" | "em_atendimento" | "finalizado";

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

export type AtualizarConversaInput = {
  statusAtendimento?: StatusAtendimento;
  atendenteResponsavel?: string | null;
  notasInternas?: string;
  arquivada?: boolean;
};

export type ResultadoProcessamentoMensagem = {
  processada: boolean;
  motivo?: string;
  telefone?: string;
};

const colMensagens = "whatsapp_mensagens";
const colConversas = "whatsapp_conversas";
type ConteudoMensagem = NonNullable<WAMessage["message"]>;

const semUndefined = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

function extensaoMidia(tipo: TipoMensagem, mimeType?: string, nomeArquivo?: string): string {
  const extNome = nomeArquivo?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (extNome) return extNome;

  const mapa: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };

  if (mimeType && mapa[mimeType]) return mapa[mimeType];
  if (tipo === "imagem") return "jpg";
  if (tipo === "audio") return "ogg";
  if (tipo === "video") return "mp4";
  if (tipo === "sticker") return "webp";
  return "bin";
}

async function uploadMidia(
  buffer: Buffer,
  telefone: string,
  msgId: string,
  tipo: TipoMensagem,
  mimeType?: string,
  nomeArquivo?: string,
): Promise<string> {
  const ext = extensaoMidia(tipo, mimeType, nomeArquivo);
  const idSeguro = msgId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `whatsapp/${telefone}/${idSeguro}.${ext}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(path);
  await file.save(buffer, { contentType: mimeType ?? "application/octet-stream" });
  const [url] = await file.getSignedUrl({ action: "read", expires: "2099-01-01" });
  return url;
}

function getMensagemEnvelopada(conteudo: ConteudoMensagem): ConteudoMensagem | null {
  const record = conteudo as Record<string, unknown>;
  const chaves = ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage"];

  for (const chave of chaves) {
    const envelope = record[chave];
    if (envelope && typeof envelope === "object" && "message" in envelope) {
      const mensagem = (envelope as { message?: ConteudoMensagem }).message;
      if (mensagem) return mensagem;
    }
  }

  return null;
}

function extrairConteudoMensagem(msg: WAMessage): ConteudoMensagem | null {
  let conteudo = msg.message;
  while (conteudo) {
    const envelope = getMensagemEnvelopada(conteudo);
    if (!envelope) return conteudo;
    conteudo = envelope;
  }

  return null;
}

function extrairTipo(conteudo: ConteudoMensagem): TipoMensagem {
  if (conteudo.imageMessage) return "imagem";
  if (conteudo.audioMessage) return "audio";
  if (conteudo.videoMessage) return "video";
  if (conteudo.documentMessage) return "documento";
  if (conteudo.stickerMessage) return "sticker";
  if (conteudo.contactMessage || conteudo.contactsArrayMessage) return "contato";
  if (conteudo.locationMessage || conteudo.liveLocationMessage) return "localizacao";
  return "texto";
}

function extrairTexto(conteudo: ConteudoMensagem): string {
  const latitude = conteudo.locationMessage?.degreesLatitude ?? conteudo.liveLocationMessage?.degreesLatitude;
  const longitude = conteudo.locationMessage?.degreesLongitude ?? conteudo.liveLocationMessage?.degreesLongitude;
  const localizacao = latitude && longitude
    ? `Localizacao: https://maps.google.com/?q=${latitude},${longitude}`
    : "";

  return (
    conteudo.conversation ||
    conteudo.extendedTextMessage?.text ||
    conteudo.imageMessage?.caption ||
    conteudo.videoMessage?.caption ||
    conteudo.documentMessage?.caption ||
    conteudo.documentMessage?.fileName ||
    conteudo.contactMessage?.displayName ||
    conteudo.contactsArrayMessage?.contacts?.map((c) => c.displayName).filter(Boolean).join(", ") ||
    localizacao ||
    ""
  );
}

function extrairMimeType(conteudo: ConteudoMensagem): string | undefined {
  return (
    conteudo.imageMessage?.mimetype ||
    conteudo.audioMessage?.mimetype ||
    conteudo.videoMessage?.mimetype ||
    conteudo.documentMessage?.mimetype ||
    conteudo.stickerMessage?.mimetype ||
    undefined
  );
}

function extrairNomeArquivo(conteudo: ConteudoMensagem): string | undefined {
  return conteudo.documentMessage?.fileName || undefined;
}

function extrairTamanhoArquivo(conteudo: ConteudoMensagem): number | undefined {
  const tamanho =
    conteudo.imageMessage?.fileLength ||
    conteudo.audioMessage?.fileLength ||
    conteudo.videoMessage?.fileLength ||
    conteudo.documentMessage?.fileLength ||
    conteudo.stickerMessage?.fileLength;

  return tamanho ? Number(tamanho) : undefined;
}

class MensagemService {
  async processarMensagemRecebida(msg: WAMessage): Promise<ResultadoProcessamentoMensagem> {
    if (!db) return { processada: false, motivo: "firebase indisponivel" };

    const jid = msg.key.remoteJid ?? "";

    // ignorar grupos, broadcasts, status e channels — só chats individuais
    if (!jid.endsWith("@s.whatsapp.net")) {
      return { processada: false, motivo: `jid nao suportado: ${jid}` };
    }

    const telefone = normalizarTelefone(jid.replace("@s.whatsapp.net", ""));

    // E.164 sem código de país: máximo 13 dígitos; mínimo 8 (válido para qualquer país)
    // IDs de canais/newsletters do WhatsApp têm 15+ dígitos após normalização
    if (telefone.length < 8 || telefone.length > 13) {
      return { processada: false, motivo: `telefone invalido: ${telefone}` };
    }

    // ignorar mensagens sem conteúdo ou mensagens de protocolo interno
    const conteudo = extrairConteudoMensagem(msg);
    if (!conteudo) return { processada: false, motivo: "sem conteudo", telefone };
    if (conteudo.protocolMessage) return { processada: false, motivo: "protocolMessage", telefone };
    if (conteudo.reactionMessage) return { processada: false, motivo: "reactionMessage", telefone };

    const tipo = extrairTipo(conteudo);
    const texto = extrairTexto(conteudo);
    const midiaMimeType = extrairMimeType(conteudo);
    const midiaNome = extrairNomeArquivo(conteudo);
    const midiaTamanho = extrairTamanhoArquivo(conteudo);
    const timestamp = new Date().toISOString();

    let midiaUrl: string | undefined;

    if (tipo === "imagem" || tipo === "audio" || tipo === "video" || tipo === "documento" || tipo === "sticker") {
      try {
        const buffer = (await downloadMediaMessage(msg, "buffer", {})) as Buffer;
        midiaUrl = await uploadMidia(buffer, telefone, msg.key.id ?? timestamp, tipo, midiaMimeType, midiaNome);
      } catch {
        console.error("[WhatsApp] Erro ao processar midia");
      }
    }

    const vinculo = await vincularCliente(telefone);
    const clienteId = vinculo?.cliente.id ?? null;
    const nome = vinculo?.cliente.nome ?? telefone;

    const mensagem: Omit<Mensagem, "id"> = {
      telefone,
      clienteId,
      de: "cliente",
      texto: texto || `[${tipo}]`,
      tipo,
      midiaUrl,
      midiaMimeType,
      midiaNome,
      midiaTamanho,
      timestamp,
      lida: false,
    };

    const docRef = db.collection(colMensagens).doc();
    await docRef.set(semUndefined({ ...mensagem, id: docRef.id }));

    await db.collection(colConversas).doc(telefone).set(
      {
        clienteId,
        nome,
        ultimaMensagem: mensagem.texto,
        ultimaInteracao: timestamp,
        naoLidas: (await this.getNaoLidas(telefone)) + 1,
      },
      { merge: true },
    );

    await botService.processarResposta(telefone, texto);
    return { processada: true, telefone };
  }

  private async getNaoLidas(telefone: string): Promise<number> {
    if (!db) return 0;
    const doc = await db.collection(colConversas).doc(telefone).get();
    return Number(doc.data()?.naoLidas ?? 0);
  }

  async salvarMensagemSaida(
    telefone: string,
    texto: string,
    tipo: TipoMensagem = "texto",
    clienteId: string | null = null,
    nome?: string,
    midia?: {
      url?: string;
      mimeType?: string;
      nome?: string;
      tamanho?: number;
    },
    waMessageId?: string | null,
  ) {
    if (!db) return;
    const timestamp = new Date().toISOString();
    const docRef = db.collection(colMensagens).doc();
    await docRef.set(semUndefined({
      id: docRef.id,
      telefone,
      clienteId,
      de: "atendente",
      texto,
      tipo,
      midiaUrl: midia?.url,
      midiaMimeType: midia?.mimeType,
      midiaNome: midia?.nome,
      midiaTamanho: midia?.tamanho,
      waMessageId,
      statusEnvio: waMessageId ? "enviado" : undefined,
      timestamp,
      lida: true,
    }));
    await db.collection(colConversas).doc(telefone).set(
      semUndefined({
        clienteId,
        nome,
        ultimaMensagem: texto,
        ultimaInteracao: timestamp,
        naoLidas: 0,
      }),
      { merge: true },
    );
  }

  async listarConversas(): Promise<Conversa[]> {
    if (!db) return [];
    const snap = await db.collection(colConversas).get();
    return snap.docs
      .map((d) => ({ telefone: d.id, ...d.data() }) as Conversa)
      .sort((a, b) => (b.ultimaInteracao ?? "").localeCompare(a.ultimaInteracao ?? ""));
  }

  async armazenarMidiaSaida(
    telefone: string,
    buffer: Buffer,
    tipo: TipoMensagem,
    mimeType?: string,
    nomeArquivo?: string,
  ): Promise<string> {
    return uploadMidia(buffer, telefone, `${Date.now()}_${nomeArquivo ?? tipo}`, tipo, mimeType, nomeArquivo);
  }

  async listarMensagens(telefone: string): Promise<Mensagem[]> {
    if (!db) return [];
    const snap = await db
      .collection(colMensagens)
      .where("telefone", "==", telefone)
      .get();
    return snap.docs
      .map((d) => d.data() as Mensagem)
      .sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""));
  }

  async marcarLidas(telefone: string) {
    if (!db) return;
    const docRef = db.collection(colConversas).doc(telefone);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({ naoLidas: 0 });
    }
  }

  async atualizarStatusEnvio(waMessageId: string | null | undefined, statusEnvio: StatusEnvio) {
    if (!db || !waMessageId) return;
    const snap = await db
      .collection(colMensagens)
      .where("waMessageId", "==", waMessageId)
      .get();

    await Promise.all(snap.docs.map((doc) => doc.ref.update({ statusEnvio })));
  }

  async atualizarConversa(telefone: string, input: AtualizarConversaInput) {
    if (!db) return;
    const tel = normalizarTelefone(telefone);
    const patch = semUndefined({
      statusAtendimento: input.statusAtendimento,
      atendenteResponsavel: input.atendenteResponsavel,
      notasInternas: input.notasInternas,
      arquivada: input.arquivada,
    });
    await db.collection(colConversas).doc(tel).set(patch, { merge: true });
  }
}

export const mensagemService = new MensagemService();
