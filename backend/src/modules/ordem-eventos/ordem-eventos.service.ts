import { db } from "../../firebase/admin.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import { ordensServicoService } from "../ordens-servico/ordens-servico.service.js";
import {
  createOrdemEventosRepository,
  type OrdemEventosRepository,
} from "./ordem-eventos.repository.js";
import type { OrdemEventoInput, OrdemEventoTipo } from "./ordem-eventos.types.js";

const now = () => new Date().toISOString();

export class OrdemEventosService {
  constructor(
    private readonly repository: OrdemEventosRepository = createOrdemEventosRepository(db),
  ) {}

  async list(
    filters?: { ordemServicoId?: string; tipo?: OrdemEventoTipo | "" },
    tenantId = DEFAULT_TENANT_ID,
  ) {
    return this.repository.list(filters, tenantId);
  }

  async create(input: OrdemEventoInput, tenantId = DEFAULT_TENANT_ID) {
    await ordensServicoService.getById(input.ordemServicoId, tenantId);

    return this.repository.create({
      ordemServicoId: input.ordemServicoId,
      tipo: input.tipo ?? "comentario",
      titulo: input.titulo,
      descricao: input.descricao,
      criadoPor: input.criadoPor,
      tenantId,
      createdAt: now(),
    });
  }
}

export const ordemEventosService = new OrdemEventosService();
