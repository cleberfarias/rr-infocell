import { db } from "../../firebase/admin.js";
import { createAparelhosRepository } from "../aparelhos/aparelhos.repository.js";
import { createClientesRepository } from "../clientes/clientes.repository.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import type { OrdemServicoFormaPagamento } from "../ordens-servico/ordens-servico.types.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { env } from "../../config/env.js";
import { conexaoService } from "./conexao.service.js";
import { mensagemService } from "./mensagem.service.js";

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

    const texto = [
      `*RR Infocell — Orcamento OS #${os.numero}*`,
      `Aparelho: ${nomeAparelho}`,
      `Defeito: ${os.defeitoRelatado}`,
      os.diagnostico ? `Diagnostico: ${os.diagnostico}` : null,
      `Valor total: R$ ${os.valorTotal.toFixed(2).replace(".", ",")}`,
      "",
      "Para *AUTORIZAR* responda: SIM",
      "Para *RECUSAR* responda: NAO",
    ]
      .filter((l) => l !== null)
      .join("\n");

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

    const texto = [
      `*RR Infocell — Aparelho pronto!* ✅`,
      `OS #${os.numero}`,
      `Seu aparelho ja pode ser retirado.`,
      `Valor total: R$ ${os.valorTotal.toFixed(2).replace(".", ",")}`,
      env.ATENDIMENTO_PIX_CHAVE ? `Chave PIX: ${env.ATENDIMENTO_PIX_CHAVE}` : null,
      `Se preferir pagar na retirada, responda: PIX, CARTAO ou DINHEIRO.`,
      `Horario: seg-sex 9h-18h, sab 9h-13h.`,
    ]
      .filter((linha) => linha !== null)
      .join("\n");

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
    const texto = [
      `*RR Infocell — Pagamento confirmado* ✅`,
      `OS #${os.numero}`,
      `Valor: R$ ${os.valorTotal.toFixed(2).replace(".", ",")} | ${formaLabel}`,
      `Obrigado pela preferencia!`,
    ].join("\n");

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

    const linhas = [
      `*RR Infocell — Status da OS #${os.numero}*`,
      `Status: ${statusLabel[os.status] ?? os.status}`,
    ];
    if (os.previsaoEntregaEm) {
      linhas.push(`Previsao: ${new Date(os.previsaoEntregaEm).toLocaleDateString("pt-BR")}`);
    }

    const texto = linhas.join("\n");
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
