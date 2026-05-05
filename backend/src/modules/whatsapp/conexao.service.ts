import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type AnyMessageContent,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { toDataURL } from "qrcode";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { mensagemService } from "./mensagem.service.js";

const noop = () => {};
const silentLogger = {
  level: "silent",
  trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
  child: () => silentLogger,
};

type ConexaoStatus = "conectando" | "qr_pendente" | "conectado" | "desconectado";

function montarJidWhatsApp(telefone: string): string {
  const telefoneNormalizado = normalizarTelefone(telefone);
  return `55${telefoneNormalizado}@s.whatsapp.net`;
}

function isLidJid(jid: string): boolean {
  return jid.endsWith("@lid") || jid.endsWith("@hosted.lid");
}

type DiagnosticoWhatsApp = {
  conectadoComo: string | null;
  ultimoEventoEm: string | null;
  ultimoEventoTipo: string | null;
  ultimaMensagemRecebidaEm: string | null;
  ultimaMensagemRecebidaDe: string | null;
  ultimaMensagemIgnoradaEm: string | null;
  ultimaMensagemIgnoradaMotivo: string | null;
  ultimoEnvioEm: string | null;
  ultimoEnvioPara: string | null;
  ultimoEnvioId: string | null;
  ultimoUpdateEm: string | null;
  ultimoUpdateId: string | null;
  ultimoUpdateStatus: string | null;
  ultimoReciboEm: string | null;
  ultimoReciboId: string | null;
  ultimoReciboDe: string | null;
};

export type EnviarMidiaWhatsAppInput = {
  telefone: string;
  buffer: Buffer;
  mimeType: string;
  nomeArquivo?: string;
  legenda?: string;
  tipo: "imagem" | "audio" | "video" | "documento" | "sticker";
};

class ConexaoService {
  private socket: WASocket | null = null;
  private status: ConexaoStatus = "desconectado";
  private qrBase64: string | null = null;
  private authDir = "./whatsapp-auth";
  private iniciadoEm = Date.now();
  private diagnostico: DiagnosticoWhatsApp = {
    conectadoComo: null,
    ultimoEventoEm: null,
    ultimoEventoTipo: null,
    ultimaMensagemRecebidaEm: null,
    ultimaMensagemRecebidaDe: null,
    ultimaMensagemIgnoradaEm: null,
    ultimaMensagemIgnoradaMotivo: null,
    ultimoEnvioEm: null,
    ultimoEnvioPara: null,
    ultimoEnvioId: null,
    ultimoUpdateEm: null,
    ultimoUpdateId: null,
    ultimoUpdateStatus: null,
    ultimoReciboEm: null,
    ultimoReciboId: null,
    ultimoReciboDe: null,
  };

  getStatus() {
    return {
      status: this.status,
      diagnostico: {
        ...this.diagnostico,
        conectadoComo: this.socket?.user?.id ?? this.diagnostico.conectadoComo,
      },
    };
  }

  getQR() {
    return this.qrBase64;
  }

  async inicializar() {
    if (this.socket) return;

    this.iniciadoEm = Date.now();
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    this.status = "conectando";

    this.socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger as never),
      },
      printQRInTerminal: false,
      logger: silentLogger as never,
    });

    this.socket.ev.on("creds.update", saveCreds);

    this.socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrBase64 = await toDataURL(qr);
        this.status = "qr_pendente";
        console.log("[WhatsApp] QR code gerado — acesse /api/whatsapp/qrcode");
      }

      if (connection === "open") {
        this.status = "conectado";
        this.qrBase64 = null;
        this.diagnostico.conectadoComo = this.socket?.user?.id ?? null;
        console.log("[WhatsApp] Conectado!");
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const reconectar = code !== DisconnectReason.loggedOut;

        this.socket = null;
        this.status = "desconectado";

        if (reconectar) {
          console.log("[WhatsApp] Reconectando...");
          setTimeout(() => this.inicializar(), 3000);
        } else {
          console.log("[WhatsApp] Deslogado. Escaneie o QR novamente.");
        }
      }
    });

    this.socket.ev.on("messages.upsert", async ({ messages, type }) => {
      this.diagnostico.ultimoEventoEm = new Date().toISOString();
      this.diagnostico.ultimoEventoTipo = `messages.upsert:${type}`;

      for (const msg of messages) {
        if (msg.key.fromMe) {
          this.diagnostico.ultimaMensagemIgnoradaEm = new Date().toISOString();
          this.diagnostico.ultimaMensagemIgnoradaMotivo = "mensagem propria";
          continue;
        }

        const timestamp = Number(msg.messageTimestamp ?? 0) * 1000;
        const mensagemAntiga = timestamp > 0 && timestamp < this.iniciadoEm - 60_000;

        if (type === "append" && mensagemAntiga) {
          this.diagnostico.ultimaMensagemIgnoradaEm = new Date().toISOString();
          this.diagnostico.ultimaMensagemIgnoradaMotivo = "historico antigo";
          continue;
        }

        if (type !== "notify" && type !== "append") {
          this.diagnostico.ultimaMensagemIgnoradaEm = new Date().toISOString();
          this.diagnostico.ultimaMensagemIgnoradaMotivo = `tipo ${type}`;
          continue;
        }

        try {
          const msgResolvida = await this.resolverMensagemLid(msg);
          if (!msgResolvida) continue;

          const resultado = await mensagemService.processarMensagemRecebida(msgResolvida);
          if (resultado.processada) {
            this.diagnostico.ultimaMensagemRecebidaEm = new Date().toISOString();
            this.diagnostico.ultimaMensagemRecebidaDe = msgResolvida.key.remoteJid ?? null;
          } else {
            this.diagnostico.ultimaMensagemIgnoradaEm = new Date().toISOString();
            this.diagnostico.ultimaMensagemIgnoradaMotivo = resultado.motivo ?? "nao processada";
          }
        } catch (err) {
          this.diagnostico.ultimaMensagemIgnoradaEm = new Date().toISOString();
          this.diagnostico.ultimaMensagemIgnoradaMotivo = err instanceof Error ? err.message : "erro ao processar";
          console.error("[WhatsApp] Erro ao processar mensagem:", err);
        }
      }
    });

    this.socket.ev.on("messages.update", (updates) => {
      const update = updates.at(-1);
      if (!update) return;

      this.diagnostico.ultimoUpdateEm = new Date().toISOString();
      this.diagnostico.ultimoUpdateId = update.key.id ?? null;
      this.diagnostico.ultimoUpdateStatus = update.update.status != null
        ? String(update.update.status)
        : null;
    });

    this.socket.ev.on("message-receipt.update", (updates) => {
      const update = updates.at(-1);
      if (!update) return;

      this.diagnostico.ultimoReciboEm = new Date().toISOString();
      this.diagnostico.ultimoReciboId = update.key.id ?? null;
      this.diagnostico.ultimoReciboDe = update.key.remoteJid ?? null;
    });
  }

  getSocket(): WASocket | null {
    return this.socket;
  }

  private async resolverMensagemLid(msg: WAMessage): Promise<WAMessage | null> {
    const jid = msg.key.remoteJid ?? "";
    if (!isLidJid(jid)) return msg;

    const jidTelefone = await this.socket?.signalRepository.lidMapping.getPNForLID(jid);
    if (!jidTelefone) {
      this.diagnostico.ultimaMensagemIgnoradaEm = new Date().toISOString();
      this.diagnostico.ultimaMensagemIgnoradaMotivo = `sem mapeamento LID para ${jid}`;
      return null;
    }

    return {
      ...msg,
      key: {
        ...msg.key,
        remoteJid: jidNormalizedUser(jidTelefone),
      },
    };
  }

  private async resolverJidEnvio(telefone: string): Promise<string> {
    if (!this.socket || this.status !== "conectado") {
      throw new Error("WhatsApp nao conectado.");
    }
    const jidConsulta = montarJidWhatsApp(telefone);
    const destinatarios = await this.socket.onWhatsApp(jidConsulta);
    const destinatario = destinatarios?.at(0);

    if (!destinatario?.exists) {
      throw new Error(`Numero ${telefone} nao encontrado no WhatsApp.`);
    }

    return destinatario.jid;
  }

  async enviarTexto(telefone: string, texto: string) {
    if (!this.socket || this.status !== "conectado") {
      throw new Error("WhatsApp nao conectado.");
    }

    const socket = this.socket;
    const jid = await this.resolverJidEnvio(telefone);
    const enviada = await socket.sendMessage(jid, { text: texto });
    this.diagnostico.ultimoEnvioEm = new Date().toISOString();
    this.diagnostico.ultimoEnvioPara = jid;
    this.diagnostico.ultimoEnvioId = enviada?.key.id ?? null;
  }

  async enviarMidia(input: EnviarMidiaWhatsAppInput) {
    if (!this.socket || this.status !== "conectado") {
      throw new Error("WhatsApp nao conectado.");
    }

    const socket = this.socket;
    const jid = await this.resolverJidEnvio(input.telefone);
    const content = this.montarConteudoMidia(input);
    const enviada = await socket.sendMessage(jid, content);
    this.diagnostico.ultimoEnvioEm = new Date().toISOString();
    this.diagnostico.ultimoEnvioPara = jid;
    this.diagnostico.ultimoEnvioId = enviada?.key.id ?? null;
    return enviada;
  }

  private montarConteudoMidia(input: EnviarMidiaWhatsAppInput): AnyMessageContent {
    if (input.tipo === "imagem") {
      return { image: input.buffer, mimetype: input.mimeType, caption: input.legenda };
    }

    if (input.tipo === "video") {
      return { video: input.buffer, mimetype: input.mimeType, caption: input.legenda };
    }

    if (input.tipo === "audio") {
      return { audio: input.buffer, mimetype: input.mimeType, ptt: false };
    }

    if (input.tipo === "sticker") {
      return { sticker: input.buffer };
    }

    return {
      document: input.buffer,
      mimetype: input.mimeType,
      fileName: input.nomeArquivo ?? "arquivo",
      caption: input.legenda,
    };
  }
}

export const conexaoService = new ConexaoService();
