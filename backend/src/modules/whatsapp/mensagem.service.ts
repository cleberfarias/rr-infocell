import { downloadMediaMessage, type WAMessage } from "@whiskeysockets/baileys";
import { getStorage } from "firebase-admin/storage";
import { db } from "../../firebase/admin.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { vincularCliente } from "./vinculo.service.js";
import { botService } from "./bot.service.js";

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

async function uploadMidia(
  buffer: Buffer,
  telefone: string,
  msgId: string,
  tipo: "imagem" | "audio" | "video",
): Promise<string> {
  const ext = tipo === "imagem" ? "jpg" : tipo === "audio" ? "ogg" : "mp4";
  const path = `whatsapp/${telefone}/${msgId}.${ext}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(path);
  await file.save(buffer, { contentType: tipo === "imagem" ? "image/jpeg" : tipo === "audio" ? "audio/ogg" : "video/mp4" });
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
  return "texto";
}

function extrairTexto(conteudo: ConteudoMensagem): string {
  return (
    conteudo.conversation ||
    conteudo.extendedTextMessage?.text ||
    conteudo.imageMessage?.caption ||
    conteudo.videoMessage?.caption ||
    ""
  );
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
    const timestamp = new Date().toISOString();

    let midiaUrl: string | undefined;

    if (tipo === "imagem" || tipo === "audio" || tipo === "video") {
      try {
        const buffer = (await downloadMediaMessage(msg, "buffer", {})) as Buffer;
        midiaUrl = await uploadMidia(buffer, telefone, msg.key.id ?? timestamp, tipo);
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
  ) {
    if (!db) return;
    const timestamp = new Date().toISOString();
    const docRef = db.collection(colMensagens).doc();
    await docRef.set({
      id: docRef.id,
      telefone,
      clienteId,
      de: "atendente",
      texto,
      tipo,
      timestamp,
      lida: true,
    });
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
}

export const mensagemService = new MensagemService();
