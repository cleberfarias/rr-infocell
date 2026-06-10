import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import { clientesService } from "../clientes/clientes.service.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import { createAparelhosRepository, type AparelhosRepository } from "./aparelhos.repository.js";
import type { AparelhoInput } from "./aparelhos.types.js";

export class AparelhosService {
  constructor(private readonly repository: AparelhosRepository = createAparelhosRepository(db)) {}

  async list(filters?: { search?: string; clienteId?: string }, tenantId = DEFAULT_TENANT_ID) {
    return this.repository.list(filters, tenantId);
  }

  async getById(id: string, tenantId?: string) {
    const aparelho = await this.repository.findById(id, tenantId);

    if (!aparelho) {
      throw new AppError("aparelho_not_found", "Aparelho nao encontrado.", httpStatus.notFound);
    }

    return aparelho;
  }

  async create(input: AparelhoInput, tenantId = DEFAULT_TENANT_ID) {
    await this.ensureClienteExists(input.clienteId, tenantId);

    return this.repository.create(input, tenantId);
  }

  async update(id: string, input: AparelhoInput, tenantId = DEFAULT_TENANT_ID) {
    await this.ensureClienteExists(input.clienteId, tenantId);

    const aparelho = await this.repository.update(id, input, tenantId);

    if (!aparelho) {
      throw new AppError("aparelho_not_found", "Aparelho nao encontrado.", httpStatus.notFound);
    }

    return aparelho;
  }

  async delete(id: string, tenantId = DEFAULT_TENANT_ID) {
    const ordens = await createOrdensServicoRepository(db).list({ aparelhoId: id }, tenantId);

    if (ordens.length > 0) {
      throw new AppError(
        "aparelho_has_ordens",
        "Aparelho possui ordens de servico vinculadas e nao pode ser excluido.",
        httpStatus.badRequest,
      );
    }

    const deleted = await this.repository.delete(id, tenantId);

    if (!deleted) {
      throw new AppError("aparelho_not_found", "Aparelho nao encontrado.", httpStatus.notFound);
    }
  }

  private async ensureClienteExists(clienteId: string, tenantId: string) {
    try {
      await clientesService.getById(clienteId, tenantId);
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
