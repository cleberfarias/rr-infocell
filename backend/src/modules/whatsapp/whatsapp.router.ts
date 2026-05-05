import { Router } from "express";
import { conexaoService } from "./conexao.service.js";
import { mensagemService } from "./mensagem.service.js";
import { acoesService } from "./acoes.service.js";
import { vincularCliente } from "./vinculo.service.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import type { TipoMensagem } from "./mensagem.service.js";

export const whatsappRoutes = Router();

const LIMITE_MIDIA_BYTES = 16 * 1024 * 1024;

function tipoMidiaPorMime(mimeType: string): Exclude<TipoMensagem, "texto" | "orcamento" | "status" | "pagamento"> {
  if (mimeType.startsWith("image/webp")) return "sticker";
  if (mimeType.startsWith("image/")) return "imagem";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "documento";
}

whatsappRoutes.get("/status", (_req, res) => {
  res.json(conexaoService.getStatus());
});

whatsappRoutes.get("/qrcode", (_req, res) => {
  const qr = conexaoService.getQR();
  if (!qr) {
    res.status(404).json({ error: "QR code nao disponivel. WhatsApp ja conectado ou ainda iniciando." });
    return;
  }
  res.json({ qr });
});

whatsappRoutes.get("/conversas", async (_req, res, next) => {
  try {
    const conversas = await mensagemService.listarConversas();
    res.json(conversas);
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.get("/conversas/:telefone", async (req, res, next) => {
  try {
    const telefone = normalizarTelefone(req.params.telefone);
    const [mensagens, vinculo] = await Promise.all([
      mensagemService.listarMensagens(telefone),
      vincularCliente(telefone),
    ]);
    await mensagemService.marcarLidas(telefone);
    res.json({
      mensagens,
      cliente: vinculo?.cliente ?? null,
      ordensAtivas: vinculo?.ordensAtivas ?? [],
    });
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.post("/enviar", async (req, res, next) => {
  try {
    const { telefone, texto } = req.body as { telefone: string; texto: string };
    const tel = normalizarTelefone(telefone);
    await conexaoService.enviarTexto(tel, texto);
    const vinculo = await vincularCliente(tel);
    await mensagemService.salvarMensagemSaida(
      tel,
      texto,
      "texto",
      vinculo?.cliente.id ?? null,
      vinculo?.cliente.nome,
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.post("/enviar-midia", async (req, res, next) => {
  try {
    const { telefone, base64, mimeType, nomeArquivo, legenda } = req.body as {
      telefone: string;
      base64: string;
      mimeType: string;
      nomeArquivo?: string;
      legenda?: string;
    };

    if (!telefone || !base64 || !mimeType) {
      throw new Error("Telefone, arquivo e tipo de midia sao obrigatorios.");
    }

    const tel = normalizarTelefone(telefone);
    const buffer = Buffer.from(base64, "base64");

    if (buffer.byteLength > LIMITE_MIDIA_BYTES) {
      throw new Error("Arquivo excede o limite de 16 MB.");
    }

    const tipo = tipoMidiaPorMime(mimeType);
    await conexaoService.enviarMidia({
      telefone: tel,
      buffer,
      mimeType,
      nomeArquivo,
      legenda,
      tipo,
    });

    const vinculo = await vincularCliente(tel);
    const midiaUrl = await mensagemService.armazenarMidiaSaida(tel, buffer, tipo, mimeType, nomeArquivo);
    await mensagemService.salvarMensagemSaida(
      tel,
      legenda || nomeArquivo || `[${tipo}]`,
      tipo,
      vinculo?.cliente.id ?? null,
      vinculo?.cliente.nome,
      {
        url: midiaUrl,
        mimeType,
        nome: nomeArquivo,
        tamanho: buffer.byteLength,
      },
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.post("/acoes/enviar-orcamento", async (req, res, next) => {
  try {
    const { osId } = req.body as { osId: string };
    await acoesService.enviarOrcamento(osId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.post("/acoes/informar-pronto", async (req, res, next) => {
  try {
    const { osId } = req.body as { osId: string };
    await acoesService.informarPronto(osId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.post("/acoes/confirmar-pagamento", async (req, res, next) => {
  try {
    const { osId, formaPagamento, valorRecebido } = req.body as {
      osId: string;
      formaPagamento: "pix" | "cartao" | "dinheiro";
      valorRecebido: number;
    };
    await acoesService.confirmarPagamento(osId, formaPagamento, valorRecebido);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

whatsappRoutes.post("/acoes/enviar-status", async (req, res, next) => {
  try {
    const { osId } = req.body as { osId: string };
    await acoesService.enviarStatus(osId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
