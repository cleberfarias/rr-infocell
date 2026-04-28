import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { db } from "../../firebase/admin.js";
import { createClientesRepository, type ClientesRepository } from "./clientes.repository.js";
import type { ClienteInput } from "./clientes.types.js";

export class ClientesService {
  constructor(private readonly repository: ClientesRepository = createClientesRepository(db)) {}

  async list(search?: string) {
    return this.repository.list(search);
  }

  async getById(id: string) {
    const cliente = await this.repository.findById(id);

    if (!cliente) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }

    return cliente;
  }

  async create(input: ClienteInput) {
    return this.repository.create(input);
  }

  async update(id: string, input: ClienteInput) {
    const cliente = await this.repository.update(id, input);

    if (!cliente) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }

    return cliente;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }
  }
}

export const clientesService = new ClientesService();
