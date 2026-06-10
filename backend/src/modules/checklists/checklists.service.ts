import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import { ordemEventosService } from "../ordem-eventos/ordem-eventos.service.js";
import { ordensServicoService } from "../ordens-servico/ordens-servico.service.js";
import { automacoesAtendimentoService } from "../whatsapp/automacoes.service.js";
import { createChecklistsRepository, type ChecklistsRepository } from "./checklists.repository.js";
import type { ChecklistInput } from "./checklists.types.js";

export class ChecklistsService {
  constructor(private readonly repository: ChecklistsRepository = createChecklistsRepository(db)) {}

  async list(
    filters?: { ordemServicoId?: string; aparelhoId?: string; tipo?: "entrada" | "saida" | "" },
    tenantId = DEFAULT_TENANT_ID,
  ) {
    return this.repository.list(filters, tenantId);
  }

  async getById(id: string, tenantId?: string) {
    const checklist = await this.repository.findById(id, tenantId);

    if (!checklist) {
      throw new AppError("checklist_not_found", "Checklist nao encontrado.", httpStatus.notFound);
    }

    return checklist;
  }

  async create(input: ChecklistInput, tenantId = DEFAULT_TENANT_ID) {
    await this.ensureOrdemMatchesAparelho(input, tenantId);

    const checklist = await this.repository.create(input, tenantId);
    await automacoesAtendimentoService.aoCriarChecklist(checklist);
    await ordemEventosService.create(
      {
        ordemServicoId: checklist.ordemServicoId,
        tipo: "checklist",
        titulo:
          checklist.tipo === "saida" ? "Checklist de saida criado" : "Checklist de entrada criado",
        descricao: `${checklist.itens.length} itens registrados.`,
        criadoPor: checklist.criadoPor,
      },
      tenantId,
    );

    return checklist;
  }

  async update(id: string, input: ChecklistInput, tenantId = DEFAULT_TENANT_ID) {
    await this.ensureOrdemMatchesAparelho(input, tenantId);

    const checklist = await this.repository.update(id, input, tenantId);

    if (!checklist) {
      throw new AppError("checklist_not_found", "Checklist nao encontrado.", httpStatus.notFound);
    }

    return checklist;
  }

  async delete(id: string, tenantId = DEFAULT_TENANT_ID) {
    const deleted = await this.repository.delete(id, tenantId);

    if (!deleted) {
      throw new AppError("checklist_not_found", "Checklist nao encontrado.", httpStatus.notFound);
    }
  }

  private async ensureOrdemMatchesAparelho(input: ChecklistInput, tenantId: string) {
    const ordem = await ordensServicoService.getById(input.ordemServicoId, tenantId);

    if (ordem.aparelhoId !== input.aparelhoId) {
      throw new AppError(
        "checklist_aparelho_mismatch",
        "Checklist deve usar o aparelho vinculado a ordem de servico.",
        httpStatus.badRequest,
      );
    }
  }
}

export const checklistsService = new ChecklistsService();
