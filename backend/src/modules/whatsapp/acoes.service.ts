import { db } from "../../firebase/admin.js";
import { createAparelhosRepository } from "../aparelhos/aparelhos.repository.js";
import { createClientesRepository } from "../clientes/clientes.repository.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import type { OrdemServicoFormaPagamento } from "../ordens-servico/ordens-servico.types.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { conexaoService } from "./conexao.service.js";
import { mensagemService } from "./mensagem.service.js";
import {
  configuracoesService,
  renderTemplate,
  buildPixChaveLinha,
} from "./configuracoes.service.js";

const ordensRepo = createOrdensServicoRepository(db);
const clientesRepo = createClientesRepository(db);
const aparelhosRepo = createAparelhosRepository(db);
const colConversas = "whatsapp_conversas";

const statusLabel: Record<string, string> = {
  recebido: "Recebido ✅",
  em_analise: "Em analise 🔍",
  aguardando_aprovacao: "Aguardando aprovacao ⏳",
  aguardando_peca: "Aguardando peca 🔧",
  em_manutencao: "Em manutencao 🔧",
  pronto_para_retirada: "Pronto para retirada ✅",
  entregue: "Entregue 📦",
  sem_conserto: "Sem conserto",
  cancelado: "Cancelado ❌",
};

function formatBRLRaw(value: number) {
  return value.toFixed(2).replace(".", ",");
}

async function getClienteContato(
  clienteId: string,
): Promise<{ telefone: string; nome: string } | null> {
  const cliente = await clientesRepo.findById(clienteId);
  if (!cliente?.telefone) return null;
  if (cliente.receberMensagemAutomatica === false) return null;
  return { telefone: normalizarTelefone(cliente.telefone), nome: cliente.nome };
}

class AcoesService {
  async enviarOrcamento(osId: string) {
    const os = await ordensRepo.findById(osId);
    if (!os) throw new Error("OS nao encontrada.");

    const contato = await getClienteContato(os.clienteId);
    if (!contato) throw new Error("Cliente sem telefone cadastrado ou com mensagens desativadas.");

    const aparelho = await aparelhosRepo.findById(os.aparelhoId);
    const nomeAparelho = aparelho ? `${aparelho.marca} ${aparelho.modelo}` : os.aparelhoId;

    const tpl = await configuracoesService.getTemplate("acao_orcamento");
    const diagnosticoLinha = os.diagnostico ? `Diagnostico: ${os.diagnostico}\n` : "";

    const texto =
      tpl?.ativo === false
        ? [
            `*RR Infocell — Orcamento OS #${os.numero}*`,
            `Aparelho: ${nomeAparelho}`,
            `Defeito: ${os.defeitoRelatado}`,
            os.diagnostico ? `Diagnostico: ${os.diagnostico}` : null,
            `Valor total: R$ ${formatBRLRaw(os.valorTotal)}`,
            "",
            "Para *AUTORIZAR* responda: SIM",
            "Para *RECUSAR* responda: NAO",
          ]
            .filter((l) => l !== null)
            .join("\n")
        : renderTemplate(tpl?.mensagem ?? "", {
            numero: String(os.numero),
            aparelho: nomeAparelho,
            defeito: os.defeitoRelatado,
            diagnosticoLinha,
            valorRaw: formatBRLRaw(os.valorTotal),
          });

    await conexaoService.enviarTexto(contato.telefone, texto);

    if (db) {
      await db.collection(colConversas).doc(contato.telefone).set(
        {
          clienteId: os.clienteId,
          nome: contato.nome,
          aguardandoAprovacao: true,
          osIdPendente: osId,
        },
        { merge: true },
      );
    }

    await mensagemService.salvarMensagemSaida(
      contato.telefone,
      texto,
      "orcamento",
      os.clienteId,
      contato.nome,
    );
  }

  async informarPronto(osId: string) {
    const os = await ordensRepo.findById(osId);
    if (!os) throw new Error("OS nao encontrada.");

    const contato = await getClienteContato(os.clienteId);
    if (!contato) throw new Error("Cliente sem telefone cadastrado ou com mensagens desativadas.");

    await ordensRepo.update(osId, { ...os, status: "pronto_para_retirada" });

    const aparelho = await aparelhosRepo.findById(os.aparelhoId);
    const nomeAparelho = aparelho ? `${aparelho.marca} ${aparelho.modelo}` : os.aparelhoId;

    const tpl = await configuracoesService.getTemplate("acao_pronto");
    const texto =
      tpl?.ativo === false
        ? [
            `*RR Infocell — Aparelho pronto!* ✅`,
            `OS #${os.numero}`,
            `Aparelho: ${nomeAparelho}`,
            `Seu aparelho ja pode ser retirado.`,
            `Valor total: R$ ${formatBRLRaw(os.valorTotal)}`,
            buildPixChaveLinha() || null,
            `Se preferir pagar na retirada, responda: PIX, CARTAO ou DINHEIRO.`,
            `Horario: seg-sex 9h-18h, sab 9h-13h.`,
          ]
            .filter((linha) => linha !== null)
            .join("\n")
        : renderTemplate(tpl?.mensagem ?? "", {
            numero: String(os.numero),
            aparelho: nomeAparelho,
            valorRaw: formatBRLRaw(os.valorTotal),
            pixChaveLinha: buildPixChaveLinha(),
          });

    await conexaoService.enviarTexto(contato.telefone, texto);
    await mensagemService.salvarMensagemSaida(
      contato.telefone,
      texto,
      "status",
      os.clienteId,
      contato.nome,
    );
  }

  async confirmarPagamento(
    osId: string,
    formaPagamento: OrdemServicoFormaPagamento,
    valorRecebido: number,
  ) {
    const os = await ordensRepo.findById(osId);
    if (!os) throw new Error("OS nao encontrada.");

    const contato = await getClienteContato(os.clienteId);
    if (!contato) throw new Error("Cliente sem telefone cadastrado ou com mensagens desativadas.");

    await ordensRepo.update(osId, {
      ...os,
      status: "entregue",
      formaPagamento,
      valorRecebido,
    });

    const formaLabel =
      formaPagamento === "pix" ? "PIX" : formaPagamento === "cartao" ? "Cartao" : "Dinheiro";

    const tpl = await configuracoesService.getTemplate("acao_pagamento");
    const texto =
      tpl?.ativo === false
        ? [
            `*RR Infocell — Pagamento confirmado* ✅`,
            `OS #${os.numero}`,
            `Valor: R$ ${formatBRLRaw(os.valorTotal)} | ${formaLabel}`,
            `Obrigado pela preferencia!`,
          ].join("\n")
        : renderTemplate(tpl?.mensagem ?? "", {
            numero: String(os.numero),
            valorRaw: formatBRLRaw(os.valorTotal),
            formaPagamento: formaLabel,
          });

    await conexaoService.enviarTexto(contato.telefone, texto);
    await mensagemService.salvarMensagemSaida(
      contato.telefone,
      texto,
      "pagamento",
      os.clienteId,
      contato.nome,
    );
  }

  async enviarStatus(osId: string) {
    const os = await ordensRepo.findById(osId);
    if (!os) throw new Error("OS nao encontrada.");

    const contato = await getClienteContato(os.clienteId);
    if (!contato) throw new Error("Cliente sem telefone cadastrado ou com mensagens desativadas.");

    const previsaoLinha = os.previsaoEntregaEm
      ? `\nPrevisao: ${new Date(os.previsaoEntregaEm).toLocaleDateString("pt-BR")}`
      : "";

    const tpl = await configuracoesService.getTemplate("acao_status");
    const texto =
      tpl?.ativo === false
        ? [
            `*RR Infocell — Status da OS #${os.numero}*`,
            `Status: ${statusLabel[os.status] ?? os.status}`,
            ...(os.previsaoEntregaEm
              ? [`Previsao: ${new Date(os.previsaoEntregaEm).toLocaleDateString("pt-BR")}`]
              : []),
          ].join("\n")
        : renderTemplate(tpl?.mensagem ?? "", {
            numero: String(os.numero),
            status: statusLabel[os.status] ?? os.status,
            previsaoLinha,
          });

    await conexaoService.enviarTexto(contato.telefone, texto);
    await mensagemService.salvarMensagemSaida(
      contato.telefone,
      texto,
      "status",
      os.clienteId,
      contato.nome,
    );
  }
}

export const acoesService = new AcoesService();
