import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
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

class ConexaoService {
  private socket: WASocket | null = null;
  private status: ConexaoStatus = "desconectado";
  private qrBase64: string | null = null;
  private authDir = "./whatsapp-auth";

  getStatus() {
    return this.status;
  }

  getQR() {
    return this.qrBase64;
  }

  async inicializar() {
    if (this.socket) return;

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
      if (type !== "notify") return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        await mensagemService.processarMensagemRecebida(msg);
      }
    });
  }

  getSocket(): WASocket | null {
    return this.socket;
  }

  async enviarTexto(telefone: string, texto: string) {
    if (!this.socket || this.status !== "conectado") {
      throw new Error("WhatsApp nao conectado.");
    }
    const jid = montarJidWhatsApp(telefone);
    await this.socket.sendMessage(jid, { text: texto });
  }
}

export const conexaoService = new ConexaoService();
