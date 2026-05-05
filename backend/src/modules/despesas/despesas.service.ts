import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import {
  createDespesasRepository,
  type DespesasRepository,
} from "./despesas.repository.js";
import type { DespesaCategoria, DespesaInput } from "./despesas.types.js";

export class DespesasService {
  constructor(
    private readonly repository: DespesasRepository = createDespesasRepository(db),
  ) {}

  async list(filters?: {
    search?: string;
    categoria?: DespesaCategoria | "";
    pago?: boolean | "";
  }) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const despesa = await this.repository.findById(id);

    if (!despesa) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }

    return despesa;
  }

  async create(input: DespesaInput) {
    return this.repository.create(input);
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
