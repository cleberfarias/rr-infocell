import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { createDespesasRepository, type DespesasRepository } from "./despesas.repository.js";
import type { DespesaCategoria, DespesaInput } from "./despesas.types.js";

export class DespesasService {
  constructor(private readonly repository: DespesasRepository = createDespesasRepository(db)) {}

  async list(
    filters?: {
      search?: string;
      categoria?: DespesaCategoria | "";
      pago?: boolean | "";
    },
    tenantId?: string,
  ) {
    return this.repository.list(filters, tenantId);
  }

  async getById(id: string, tenantId?: string) {
    const despesa = await this.repository.findById(id, tenantId);

    if (!despesa) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }

    return despesa;
  }

  async create(input: DespesaInput, tenantId?: string) {
    return this.repository.create(input, tenantId);
  }

  async update(id: string, input: DespesaInput) {
    const despesa = await this.repository.update(id, input);

    if (!despesa) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }

    return despesa;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }
  }
}

export const despesasService = new DespesasService();
