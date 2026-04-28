import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { clientesRepository, type ClientesRepository } from "./clientes.repository.js";
import type { ClienteInput } from "./clientes.types.js";

export class ClientesService {
  constructor(private readonly repository: ClientesRepository = clientesRepository) {}

  list(search?: string) {
    return this.repository.list(search);
  }

  getById(id: string) {
    const cliente = this.repository.findById(id);

    if (!cliente) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }

    return cliente;
  }

  create(input: ClienteInput) {
    return this.repository.create(input);
  }

  update(id: string, input: ClienteInput) {
    const cliente = this.repository.update(id, input);

    if (!cliente) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }

    return cliente;
  }

  delete(id: string) {
    const deleted = this.repository.delete(id);

    if (!deleted) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }
  }
}

export const clientesService = new ClientesService();
