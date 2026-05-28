import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { db } from "../../firebase/admin.js";
import { createAparelhosRepository } from "../aparelhos/aparelhos.repository.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
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
    return this.repository.create({
      ...input,
      telefone: input.telefone ? normalizarTelefone(input.telefone) : undefined,
    });
  }

  async update(id: string, input: ClienteInput) {
    const cliente = await this.repository.update(id, {
      ...input,
      telefone: input.telefone ? normalizarTelefone(input.telefone) : undefined,
    });

    if (!cliente) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }

    return cliente;
  }

  async delete(id: string) {
    const [aparelhos, ordens] = await Promise.all([
      createAparelhosRepository(db).list({ clienteId: id }),
      createOrdensServicoRepository(db).list({ clienteId: id }),
    ]);

    if (ordens.length > 0) {
      throw new AppError(
        "cliente_has_ordens",
        "Cliente possui ordens de servico vinculadas e nao pode ser excluido.",
        httpStatus.badRequest,
      );
    }

    if (aparelhos.length > 0) {
      throw new AppError(
        "cliente_has_aparelhos",
        "Cliente possui aparelhos vinculados e nao pode ser excluido.",
        httpStatus.badRequest,
      );
    }

    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError("cliente_not_found", "Cliente nao encontrado.", httpStatus.notFound);
    }
  }
}

export const clientesService = new ClientesService();
