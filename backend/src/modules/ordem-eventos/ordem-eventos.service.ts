import { db } from "../../firebase/admin.js";
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

  async list(filters?: { ordemServicoId?: string; tipo?: OrdemEventoTipo | "" }) {
    return this.repository.list(filters);
  }

  async create(input: OrdemEventoInput) {
    await ordensServicoService.getById(input.ordemServicoId);

    return this.repository.create({
      ordemServicoId: input.ordemServicoId,
      tipo: input.tipo ?? "comentario",
      titulo: input.titulo,
      descricao: input.descricao,
      criadoPor: input.criadoPor,
      createdAt: now(),
    });
  }
}

export const ordemEventosService = new OrdemEventosService();
