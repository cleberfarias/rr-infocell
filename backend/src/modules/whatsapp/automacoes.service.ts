import { env } from "../../config/env.js";
import { db } from "../../firebase/admin.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { createAparelhosRepository } from "../aparelhos/aparelhos.repository.js";
import type { Checklist } from "../checklists/checklists.types.js";
import { createClientesRepository } from "../clientes/clientes.repository.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import type { OrdemServico, OrdemServicoStatus } from "../ordens-servico/ordens-servico.types.js";
import { conexaoService } from "./conexao.service.js";
import { mensagemService } from "./mensagem.service.js";
import {
  configuracoesService,
  renderTemplate,
  buildPixInfo,
  buildPixRetiradaInfo,
} from "./configuracoes.service.js";

const clientesRepo = createClientesRepository(db);
const aparelhosRepo = createAparelhosRepository(db);
const ordensRepo = createOrdensServicoRepository(db);
const colConversas = "whatsapp_conversas";
const colOrdens = "ordensServico";

const now = () => new Date().toISOString();
const addHours = (date: string, hours: number) =>
  new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);
const addDays = (date: string, days: number) =>
  new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function formatBRLRaw(value: number) {
  return value.toFixed(2).replace(".", ",");
}

async function getAparelhoNome(os: OrdemServico): Promise<string> {
  const aparelho = await aparelhosRepo.findById(os.aparelhoId);
  return aparelho ? `${aparelho.marca} ${aparelho.modelo}`.trim() : os.aparelhoId;
}

const STATUS_TEMPLATE_MAP: Partial<Record<OrdemServicoStatus, string>> = {
  em_analise: "status_em_analise",
  aguardando_peca: "status_aguardando_peca",
  em_manutencao: "status_em_manutencao",
  pronto_para_retirada: "status_pronto_para_retirada",
  sem_conserto: "status_sem_conserto",
};

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

    const tpl = await configuracoesService.getTemplate("abertura");
    if (!tpl?.ativo) return;

    const aparelhoNome = await getAparelhoNome(os);
    const texto = renderTemplate(tpl.mensagem, {
      numero: String(os.numero),
      aparelho: aparelhoNome,
    });

    const enviada = await this.enviarAutomacaoOrdem(os, texto, "status");
    if (enviada) {
      await this.marcarAutomacaoOrdem(os.id, { "automacoes.aberturaEnviadaEm": now() });
    }
  }

  async aoAtualizarOrdem(current: OrdemServico, next: OrdemServico) {
    if (env.NODE_ENV === "test") return;
    if (current.status === next.status) return;

    const templateId = STATUS_TEMPLATE_MAP[next.status];
    if (!templateId) return;

    const tpl = await configuracoesService.getTemplate(templateId);
    if (!tpl?.ativo) return;
    if (next.automacoes?.statusNotificados?.[next.status]) return;

    const aparelhoNome = await getAparelhoNome(next);
    const texto = renderTemplate(tpl.mensagem, {
      numero: String(next.numero),
      aparelho: aparelhoNome,
      valor: formatBRL(next.valorTotal),
      valorRaw: formatBRLRaw(next.valorTotal),
      pixInfo: buildPixInfo(),
    });

    const enviada = await this.enviarAutomacaoOrdem(next, texto, "status");
    if (enviada) {
      await this.marcarAutomacaoOrdem(next.id, {
        [`automacoes.statusNotificados.${next.status}`]: now(),
      });
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

    const tpl = await configuracoesService.getTemplate("checklist");
    if (!tpl?.ativo) return;

    const aparelhoNome = await getAparelhoNome(os);
    const itensComDefeito = checklist.itens.filter((item) => item.status === "com_defeito");
    const defeitosItens =
      itensComDefeito.length > 0
        ? `Itens com defeito: ${itensComDefeito.map((item) => item.nome).join(", ")}.`
        : "Itens com defeito: nenhum informado.";
    const observacoesLinha = checklist.observacoesGerais
      ? `\nObservacoes: ${checklist.observacoesGerais}`
      : "";
    const criadoPorSufixo = checklist.criadoPor ? ` por ${checklist.criadoPor}` : "";

    const texto = renderTemplate(tpl.mensagem, {
      numero: String(os.numero),
      aparelho: aparelhoNome,
      tipoChecklist: checklist.tipo === "saida" ? "saida" : "entrada",
      criadoPorSufixo,
      defeitosItens,
      fotos: String(checklist.fotos.length),
      observacoesLinha,
    });

    await this.enviarAutomacaoOrdem(os, texto, "status");
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

    const tpl = await configuracoesService.getTemplate("lembrete_orcamento");
    if (!tpl?.ativo) return;

    for (const os of ordens) {
      if (os.automacoes?.lembreteOrcamentoEnviadoEm) continue;
      const base = os.updatedAt || os.createdAt;
      if (addHours(base, env.ATENDIMENTO_LEMBRETE_ORCAMENTO_HORAS) > limite) continue;

      const aparelhoNome = await getAparelhoNome(os);
      const texto = renderTemplate(tpl.mensagem, {
        numero: String(os.numero),
        aparelho: aparelhoNome,
      });

      const enviada = await this.enviarAutomacaoOrdem(os, texto, "orcamento");
      if (enviada) {
        await this.marcarAutomacaoOrdem(os.id, { "automacoes.lembreteOrcamentoEnviadoEm": now() });
      }
    }
  }

  private async processarRetiradasPendentes() {
    const ordens = await ordensRepo.list({ status: "pronto_para_retirada" });
    const limite = new Date();

    const tpl = await configuracoesService.getTemplate("lembrete_retirada");
    if (!tpl?.ativo) return;

    for (const os of ordens) {
      if (os.automacoes?.lembreteRetiradaEnviadoEm) continue;
      const base = os.concluidaEm || os.updatedAt || os.createdAt;
      if (addDays(base, env.ATENDIMENTO_LEMBRETE_RETIRADA_DIAS) > limite) continue;

      const aparelhoNome = await getAparelhoNome(os);
      const texto = renderTemplate(tpl.mensagem, {
        numero: String(os.numero),
        aparelho: aparelhoNome,
        valor: formatBRL(os.valorTotal),
        pixRetiradaInfo: buildPixRetiradaInfo(),
      });

      const enviada = await this.enviarAutomacaoOrdem(os, texto, "status");
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
