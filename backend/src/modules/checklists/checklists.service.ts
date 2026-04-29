import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { ordensServicoService } from "../ordens-servico/ordens-servico.service.js";
import { createChecklistsRepository, type ChecklistsRepository } from "./checklists.repository.js";
import type { ChecklistInput } from "./checklists.types.js";

export class ChecklistsService {
  constructor(private readonly repository: ChecklistsRepository = createChecklistsRepository(db)) {}

  async list(filters?: { ordemServicoId?: string; aparelhoId?: string }) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const checklist = await this.repository.findById(id);

    if (!checklist) {
      throw new AppError("checklist_not_found", "Checklist nao encontrado.", httpStatus.notFound);
    }

    return checklist;
  }

  async create(input: ChecklistInput) {
    await this.ensureOrdemMatchesAparelho(input);

    return this.repository.create(input);
  }

  async update(id: string, input: ChecklistInput) {
    await this.ensureOrdemMatchesAparelho(input);

    const checklist = await this.repository.update(id, input);

    if (!checklist) {
      throw new AppError("checklist_not_found", "Checklist nao encontrado.", httpStatus.notFound);
    }

    return checklist;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError("checklist_not_found", "Checklist nao encontrado.", httpStatus.notFound);
    }
  }

  private async ensureOrdemMatchesAparelho(input: ChecklistInput) {
    const ordem = await ordensServicoService.getById(input.ordemServicoId);

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
