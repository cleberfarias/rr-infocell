import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { aparelhosService } from "../aparelhos/aparelhos.service.js";
import { clientesService } from "../clientes/clientes.service.js";
import {
  createOrdensServicoRepository,
  isTerminalStatus,
  type OrdensServicoRepository,
} from "./ordens-servico.repository.js";
import type { OrdemServicoInput, OrdemServicoStatus } from "./ordens-servico.types.js";

export class OrdensServicoService {
  constructor(
    private readonly repository: OrdensServicoRepository = createOrdensServicoRepository(db),
  ) {}

  async list(filters?: {
    search?: string;
    status?: OrdemServicoStatus | "";
    clienteId?: string;
    aparelhoId?: string;
  }) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const ordem = await this.repository.findById(id);

    if (!ordem) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }

    return ordem;
  }

  async create(input: OrdemServicoInput) {
    await this.ensureClienteAndAparelho(input);

    return this.repository.create(input);
  }

  async update(id: string, input: OrdemServicoInput) {
    const current = await this.getById(id);

    if (isTerminalStatus(current.status)) {
      throw new AppError(
        "ordem_servico_locked",
        "Ordem de servico entregue ou cancelada nao pode ser editada.",
        httpStatus.badRequest,
      );
    }

    await this.ensureClienteAndAparelho(input);

    const ordem = await this.repository.update(id, input);

    if (!ordem) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }

    return ordem;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }
  }

  private async ensureClienteAndAparelho(input: OrdemServicoInput) {
    const [cliente, aparelho] = await Promise.all([
      clientesService.getById(input.clienteId),
      aparelhosService.getById(input.aparelhoId),
    ]);

    if (aparelho.clienteId !== cliente.id) {
      throw new AppError(
        "aparelho_cliente_mismatch",
        "Aparelho nao pertence ao cliente informado.",
        httpStatus.badRequest,
      );
    }
  }
}

export const ordensServicoService = new OrdensServicoService();
