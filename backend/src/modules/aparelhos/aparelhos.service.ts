import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { clientesService } from "../clientes/clientes.service.js";
import { createAparelhosRepository, type AparelhosRepository } from "./aparelhos.repository.js";
import type { AparelhoInput } from "./aparelhos.types.js";

export class AparelhosService {
  constructor(private readonly repository: AparelhosRepository = createAparelhosRepository(db)) {}

  async list(filters?: { search?: string; clienteId?: string }) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const aparelho = await this.repository.findById(id);

    if (!aparelho) {
      throw new AppError("aparelho_not_found", "Aparelho nao encontrado.", httpStatus.notFound);
    }

    return aparelho;
  }

  async create(input: AparelhoInput) {
    await this.ensureClienteExists(input.clienteId);

    return this.repository.create(input);
  }

  async update(id: string, input: AparelhoInput) {
    await this.ensureClienteExists(input.clienteId);

    const aparelho = await this.repository.update(id, input);

    if (!aparelho) {
      throw new AppError("aparelho_not_found", "Aparelho nao encontrado.", httpStatus.notFound);
    }

    return aparelho;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError("aparelho_not_found", "Aparelho nao encontrado.", httpStatus.notFound);
    }
  }

  private async ensureClienteExists(clienteId: string) {
    try {
      await clientesService.getById(clienteId);
    } catch (error) {
      if (error instanceof AppError && error.code === "cliente_not_found") {
        throw new AppError(
          "cliente_not_found",
          "Cliente vinculado nao encontrado.",
          httpStatus.notFound,
        );
      }

      throw error;
    }
  }
}

export const aparelhosService = new AparelhosService();
