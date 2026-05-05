import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { ordemEventosService } from "../ordem-eventos/ordem-eventos.service.js";
import { ordensServicoService } from "../ordens-servico/ordens-servico.service.js";
import {
  createOrcamentosRepository,
  type OrcamentosRepository,
} from "./orcamentos.repository.js";
import type { OrcamentoInput, OrcamentoStatus } from "./orcamentos.types.js";

const now = () => new Date().toISOString();

export class OrcamentosService {
  constructor(
    private readonly repository: OrcamentosRepository =
      createOrcamentosRepository(db),
  ) {}

  async list(filters?: {
    ordemServicoId?: string;
    status?: OrcamentoStatus | "";
  }) {
    return this.repository.list(filters);
  }

  async upsert(input: OrcamentoInput) {
    const ordem = await ordensServicoService.getById(input.ordemServicoId);
    const current = await this.repository.findLatestByOrdem(ordem.id);
    const timestamp = now();
    const status = input.status ?? current?.status ?? "rascunho";
    const base = {
      ordemServicoId: ordem.id,
      numeroOs: ordem.numero,
      clienteId: ordem.clienteId,
      aparelhoId: ordem.aparelhoId,
      status,
      diagnostico: ordem.diagnostico,
      pecas: ordem.pecasUsadas,
      valorPecas: ordem.valorPecas,
      valorMaoObra: ordem.valorMaoObra,
      valorTotal: ordem.valorTotal,
      enviadoEm:
        status === "enviado" ? current?.enviadoEm ?? timestamp : current?.enviadoEm,
      decididoEm:
        status === "aprovado" || status === "reprovado"
          ? current?.decididoEm ?? timestamp
          : current?.decididoEm,
      observacoes: input.observacoes ?? current?.observacoes,
      updatedAt: timestamp,
    };
    const orcamento = current
      ? await this.repository.update(current.id, base)
      : await this.repository.create({
          ...base,
          createdAt: timestamp,
        });

    if (!orcamento) {
      throw new AppError(
        "orcamento_not_found",
        "Orcamento nao encontrado.",
        httpStatus.notFound,
      );
    }

    await ordemEventosService.create({
      ordemServicoId: ordem.id,
      tipo: "orcamento",
      titulo: `Orcamento ${this.statusLabel(status)}`,
      descricao: `Total ${orcamento.valorTotal.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}`,
      criadoPor: "Sistema",
    });

    return orcamento;
  }

  private statusLabel(status: OrcamentoStatus) {
    const labels: Record<OrcamentoStatus, string> = {
      aprovado: "aprovado",
      enviado: "enviado",
      rascunho: "em rascunho",
      reprovado: "reprovado",
    };

    return labels[status];
  }
}

export const orcamentosService = new OrcamentosService();
