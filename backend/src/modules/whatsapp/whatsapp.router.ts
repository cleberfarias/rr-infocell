import { Router } from "express";
import { conexaoService } from "./conexao.service.js";
import { mensagemService } from "./mensagem.service.js";
import { acoesService } from "./acoes.service.js";
import { vincularCliente } from "./vinculo.service.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";

export const whatsappRoutes = Router();

whatsappRoutes.get("/status", (_req, res) => {
  res.json({ status: conexaoService.getStatus() });
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
