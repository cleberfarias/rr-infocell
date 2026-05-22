import { env } from "../../config/env.js";
import { db } from "../../firebase/admin.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { aparelhosService } from "../aparelhos/aparelhos.service.js";
import type { Aparelho } from "../aparelhos/aparelhos.types.js";
import type { Checklist } from "../checklists/checklists.types.js";
import { createClientesRepository } from "../clientes/clientes.repository.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import type { OrdemServico, OrdemServicoStatus } from "../ordens-servico/ordens-servico.types.js";
import { conexaoService } from "./conexao.service.js";
import { mensagemService } from "./mensagem.service.js";

const clientesRepo = createClientesRepository(db);
const ordensRepo = createOrdensServicoRepository(db);
const colConversas = "whatsapp_conversas";
const colOrdens = "ordensServico";

const now = () => new Date().toISOString();
const addHours = (date: string, hours: number) =>
  new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);
const addDays = (date: string, days: number) =>
  new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000);

const statusMensagens: Partial<Record<OrdemServicoStatus, (os: OrdemServico) => string>> = {
  em_analise: (os) =>
    [
      `*RR Infocell - OS #${os.numero}*`,
      "Seu aparelho entrou em analise tecnica.",
      "Assim que tivermos o diagnostico, avisaremos por aqui.",
    ].join("\n"),
  aguardando_peca: (os) =>
    [
      `*RR Infocell - OS #${os.numero}*`,
      "Seu atendimento esta aguardando peca.",
      "Vamos avisar assim que a manutencao puder continuar.",
    ].join("\n"),
  em_manutencao: (os) =>
    [
      `*RR Infocell - OS #${os.numero}*`,
      "O servico foi iniciado e seu aparelho esta em manutencao.",
    ].join("\n"),
  pronto_para_retirada: (os) => mensagemProntoRetirada(os),
  sem_conserto: (os) =>
    [
      `*RR Infocell - OS #${os.numero}*`,
      "Apos a analise tecnica, nao foi possivel realizar o conserto do aparelho.",
      "Seu aparelho esta disponivel para retirada. Se tiver duvidas, responda esta mensagem.",
    ].join("\n"),
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function mensagemProntoRetirada(os: OrdemServico) {
  const linhas = [
    `*RR Infocell - Aparelho pronto!*`,
    `OS #${os.numero}`,
    `Seu aparelho ja pode ser retirado.`,
    `Valor total: ${formatBRL(os.valorTotal)}`,
  ];

  if (env.ATENDIMENTO_PIX_CHAVE) {
    linhas.push("");
    linhas.push("*Pagamento via PIX*");
    if (env.ATENDIMENTO_PIX_NOME) linhas.push(`Favorecido: ${env.ATENDIMENTO_PIX_NOME}`);
    linhas.push(`Chave PIX: ${env.ATENDIMENTO_PIX_CHAVE}`);
  }

  linhas.push("");
  linhas.push("Se preferir pagar na retirada, responda: PIX, CARTAO ou DINHEIRO.");
  linhas.push("Horario: seg-sex 9h-18h, sab 9h-13h.");

  return linhas.join("\n");
}

function formatAparelho(aparelho?: Aparelho | null) {
  if (!aparelho) return null;

  const modelo = [aparelho.marca, aparelho.modelo].filter(Boolean).join(" ").trim();
  const detalhes = [
    aparelho.cor,
    aparelho.imeiSerial ? `IMEI/Serial: ${aparelho.imeiSerial}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
  const descricao = [modelo, detalhes].filter(Boolean).join(" - ");

  return descricao || null;
}

function mensagemAbertura(os: OrdemServico, aparelho?: Aparelho | null) {
  const linhas = [`*RR Infocell - OS #${os.numero} aberta*`, "Recebemos seu aparelho."];
  const aparelhoDescricao = formatAparelho(aparelho);

  if (aparelhoDescricao) {
    linhas.push(`Aparelho: ${aparelhoDescricao}`);
  }

  linhas.push("Vamos iniciar a analise tecnica e avisaremos por aqui quando houver atualizacao.");

  return linhas.join("\n");
}

function mensagemOrcamentoPendente(os: OrdemServico) {
  return [
    `*RR Infocell - Orcamento pendente*`,
    `A OS #${os.numero} ainda aguarda sua aprovacao.`,
    "Para autorizar responda: SIM",
    "Para recusar responda: NAO",
  ].join("\n");
}

function mensagemRetiradaPendente(os: OrdemServico) {
  return [
    `*RR Infocell - Retirada pendente*`,
    `Sua OS #${os.numero} esta pronta para retirada.`,
    `Valor total: ${formatBRL(os.valorTotal)}`,
    env.ATENDIMENTO_PIX_CHAVE
      ? `Chave PIX: ${env.ATENDIMENTO_PIX_CHAVE}`
      : "Voce pode confirmar a forma de pagamento por aqui.",
  ].join("\n");
}

function mensagemChecklist(os: OrdemServico, checklist: Checklist) {
  const itensComDefeito = checklist.itens.filter((item) => item.status === "com_defeito");
  const linhas = [
    `*RR Infocell - Checklist da OS #${os.numero}*`,
    `Checklist de ${checklist.tipo === "saida" ? "saida" : "entrada"} registrado${checklist.criadoPor ? ` por ${checklist.criadoPor}` : ""}.`,
    itensComDefeito.length > 0
      ? `Itens com defeito: ${itensComDefeito.map((item) => item.nome).join(", ")}.`
      : "Itens com defeito: nenhum informado.",
    `Fotos anexadas: ${checklist.fotos.length}.`,
  ];

  if (checklist.observacoesGerais) {
    linhas.push(`Observacoes: ${checklist.observacoesGerais}`);
  }

  linhas.push("Vamos seguir com a analise tecnica e avisaremos por aqui.");

  return linhas.join("\n");
}

class AutomacoesAtendimentoService {
  private timer: NodeJS.Timeout | null = null;
  private processandoPendencias = false;

  iniciarRotina() {
    if (this.timer || env.NODE_ENV === "test") return;

    this.timer = setInterval(
      () => {
        this.processarPendencias().catch((err) => {
          console.error("[WhatsApp] Falha nas automacoes:", err);
        });
      },
      30 * 60 * 1000,
    );
    this.timer.unref();
  }

  async aoCriarOrdem(os: OrdemServico) {
    if (env.NODE_ENV === "test") return;
    const aparelho = await aparelhosService.getById(os.aparelhoId).catch(() => null);
    const enviada = await this.enviarAutomacaoOrdem(os, mensagemAbertura(os, aparelho), "status");
    if (enviada) {
      await this.marcarAutomacaoOrdem(os.id, { "automacoes.aberturaEnviadaEm": now() });
    }
  }

  async aoAtualizarOrdem(current: OrdemServico, next: OrdemServico) {
    if (env.NODE_ENV === "test") return;
    if (current.status === next.status) return;

    const textoStatus = statusMensagens[next.status]?.(next);
    if (textoStatus && !next.automacoes?.statusNotificados?.[next.status]) {
      const enviada = await this.enviarAutomacaoOrdem(next, textoStatus, "status");
      if (enviada) {
        await this.marcarAutomacaoOrdem(next.id, {
          [`automacoes.statusNotificados.${next.status}`]: now(),
        });
      }
    }

    if (
      next.status === "entregue" ||
      next.status === "sem_conserto" ||
      next.status === "cancelado"
    ) {
      await this.finalizarConversa(next);
    }
  }

  async aoCriarChecklist(checklist: Checklist) {
    if (env.NODE_ENV === "test") return;

    const os = await ordensRepo.findById(checklist.ordemServicoId);
    if (!os) return;

    await this.enviarAutomacaoOrdem(os, mensagemChecklist(os, checklist), "status");
  }

  async processarPendencias() {
    if (!db || this.processandoPendencias) return;
    this.processandoPendencias = true;

    try {
      await Promise.all([
        this.processarOrcamentosPendentes(),
        this.processarRetiradasPendentes(),
        this.autoarquivarFinalizadas(),
      ]);
    } finally {
      this.processandoPendencias = false;
    }
  }

  private async processarOrcamentosPendentes() {
    const ordens = await ordensRepo.list({ status: "aguardando_aprovacao" });
    const limite = new Date();

    for (const os of ordens) {
      if (os.automacoes?.lembreteOrcamentoEnviadoEm) continue;
      const base = os.updatedAt || os.createdAt;
      if (addHours(base, env.ATENDIMENTO_LEMBRETE_ORCAMENTO_HORAS) > limite) continue;

      const enviada = await this.enviarAutomacaoOrdem(
        os,
        mensagemOrcamentoPendente(os),
        "orcamento",
      );
      if (enviada) {
        await this.marcarAutomacaoOrdem(os.id, { "automacoes.lembreteOrcamentoEnviadoEm": now() });
      }
    }
  }

  private async processarRetiradasPendentes() {
    const ordens = await ordensRepo.list({ status: "pronto_para_retirada" });
    const limite = new Date();

    for (const os of ordens) {
      if (os.automacoes?.lembreteRetiradaEnviadoEm) continue;
      const base = os.concluidaEm || os.updatedAt || os.createdAt;
      if (addDays(base, env.ATENDIMENTO_LEMBRETE_RETIRADA_DIAS) > limite) continue;

      const enviada = await this.enviarAutomacaoOrdem(os, mensagemRetiradaPendente(os), "status");
      if (enviada) {
        await this.marcarAutomacaoOrdem(os.id, { "automacoes.lembreteRetiradaEnviadoEm": now() });
      }
    }
  }

  private async autoarquivarFinalizadas() {
    if (!db) return;
    const snap = await db
      .collection(colConversas)
      .where("statusAtendimento", "==", "finalizado")
      .get();
    const limite = new Date();

    await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        if (data.arquivada === true) return;
        const ultimaInteracao = String(data.ultimaInteracao ?? "");
        if (
          !ultimaInteracao ||
          addDays(ultimaInteracao, env.ATENDIMENTO_AUTOARQUIVAR_DIAS) > limite
        )
          return;

        await doc.ref.set(
          {
            arquivada: true,
            arquivadoAutomaticamenteEm: now(),
          },
          { merge: true },
        );
      }),
    );
  }

  private async enviarAutomacaoOrdem(
    os: OrdemServico,
    texto: string,
    tipo: "status" | "orcamento" | "pagamento" = "status",
  ): Promise<boolean> {
    try {
      const cliente = await clientesRepo.findById(os.clienteId);
      if (!cliente?.telefone) return false;
      if (cliente.receberMensagemAutomatica === false) return false;

      const telefone = normalizarTelefone(cliente.telefone);
      const enviada = await conexaoService.enviarTexto(telefone, texto);
      await mensagemService.salvarMensagemSaida(
        telefone,
        texto,
        tipo,
        cliente.id,
        cliente.nome,
        undefined,
        enviada?.key.id,
      );
      return true;
    } catch (err) {
      console.warn("[WhatsApp] Automacao nao enviada:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  private async finalizarConversa(os: OrdemServico) {
    if (!db) return;
    const cliente = await clientesRepo.findById(os.clienteId);
    if (!cliente?.telefone) return;

    await db.collection(colConversas).doc(normalizarTelefone(cliente.telefone)).set(
      {
        statusAtendimento: "finalizado",
      },
      { merge: true },
    );
  }

  private async marcarAutomacaoOrdem(osId: string, patch: Record<string, string>) {
    if (!db) return;
    const docRef = db.collection(colOrdens).doc(osId);
    await docRef.update(patch).catch(() => docRef.set(patch, { merge: true }));
  }
}

export const automacoesAtendimentoService = new AutomacoesAtendimentoService();
