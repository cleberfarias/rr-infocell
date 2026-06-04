import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type { Orcamento, OrcamentoStatus } from "./orcamentos.types.js";

const orcamentosCollection = "orcamentos";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
const getOrcamentoTenantId = (o: Orcamento) => o.tenantId ?? DEFAULT_TENANT_ID;

export interface OrcamentosRepository {
  list(
    filters?: { ordemServicoId?: string; status?: OrcamentoStatus | "" },
    tenantId?: string,
  ): Promise<Orcamento[]>;
  findById(id: string, tenantId?: string): Promise<Orcamento | null>;
  findLatestByOrdem(ordemServicoId: string, tenantId?: string): Promise<Orcamento | null>;
  create(input: Omit<Orcamento, "id">): Promise<Orcamento>;
  update(id: string, input: Omit<Orcamento, "id" | "createdAt">): Promise<Orcamento | null>;
}

const filterOrcamentos = (
  orcamentos: Orcamento[],
  filters: {
    ordemServicoId?: string;
    status?: OrcamentoStatus | "";
  } = {},
) =>
  orcamentos.filter((orcamento) => {
    const matchesOrdem =
      !filters.ordemServicoId || orcamento.ordemServicoId === filters.ordemServicoId;
    const matchesStatus = !filters.status || orcamento.status === filters.status;

    return matchesOrdem && matchesStatus;
  });

export class MemoryOrcamentosRepository implements OrcamentosRepository {
  private readonly orcamentos = new Map<string, Orcamento>();

  async list(
    filters: {
      ordemServicoId?: string;
      status?: OrcamentoStatus | "";
    } = {},
    _tenantId?: string,
  ) {
    const orcamentos = Array.from(this.orcamentos.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );

    return filterOrcamentos(orcamentos, filters);
  }

  async findById(id: string, _tenantId?: string) {
    return this.orcamentos.get(id) ?? null;
  }

  async findLatestByOrdem(ordemServicoId: string, tenantId?: string) {
    const [latest] = await this.list({ ordemServicoId }, tenantId);

    return latest ?? null;
  }

  async create(input: Omit<Orcamento, "id">) {
    const orcamento: Orcamento = {
      id: randomUUID(),
      ...input,
    };

    this.orcamentos.set(orcamento.id, orcamento);

    return orcamento;
  }

  async update(id: string, input: Omit<Orcamento, "id" | "createdAt">) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const orcamento: Orcamento = {
      ...current,
      ...input,
      id,
      createdAt: current.createdAt,
    };

    this.orcamentos.set(id, orcamento);

    return orcamento;
  }
}

export class FirestoreOrcamentosRepository implements OrcamentosRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      ordemServicoId?: string;
      status?: OrcamentoStatus | "";
    } = {},
    tenantId = DEFAULT_TENANT_ID,
  ) {
    let query: FirebaseFirestore.Query = this.firestore.collection(orcamentosCollection);

    if (tenantId !== DEFAULT_TENANT_ID) {
      query = query.where("tenantId", "==", tenantId);
    }

    if (filters.ordemServicoId) {
      query = query.where("ordemServicoId", "==", filters.ordemServicoId);
    }

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    const snapshot = await query.get();
    const orcamentos = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .filter((o) => getOrcamentoTenantId(o) === tenantId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return filterOrcamentos(orcamentos, filters);
  }

  async findById(id: string, tenantId?: string) {
    const document = await this.firestore.collection(orcamentosCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    const orcamento = this.fromDocument(document.id, document.data() ?? {});

    if (tenantId && getOrcamentoTenantId(orcamento) !== tenantId) {
      return null;
    }

    return orcamento;
  }

  async findLatestByOrdem(ordemServicoId: string, tenantId?: string) {
    const [latest] = await this.list({ ordemServicoId }, tenantId);

    return latest ?? null;
  }

  async create(input: Omit<Orcamento, "id">) {
    const document = this.firestore.collection(orcamentosCollection).doc();
    const orcamento: Orcamento = {
      id: document.id,
      ...input,
    };

    await document.set(withoutUndefined(orcamento));

    return orcamento;
  }

  async update(id: string, input: Omit<Orcamento, "id" | "createdAt">) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const orcamento: Orcamento = {
      ...current,
      ...input,
      id,
      createdAt: current.createdAt,
    };

    await this.firestore.collection(orcamentosCollection).doc(id).set(withoutUndefined(orcamento));

    return orcamento;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Orcamento {
    return {
      id,
      ordemServicoId: String(data.ordemServicoId ?? ""),
      numeroOs: Number(data.numeroOs ?? 0),
      clienteId: String(data.clienteId ?? ""),
      aparelhoId: String(data.aparelhoId ?? ""),
      status: String(data.status ?? "rascunho") as OrcamentoStatus,
      diagnostico: data.diagnostico ? String(data.diagnostico) : undefined,
      pecas: Array.isArray(data.pecas) ? data.pecas : [],
      valorPecas: Number(data.valorPecas ?? 0),
      valorMaoObra: Number(data.valorMaoObra ?? 0),
      valorTotal: Number(data.valorTotal ?? 0),
      enviadoEm: data.enviadoEm ? String(data.enviadoEm) : undefined,
      decididoEm: data.decididoEm ? String(data.decididoEm) : undefined,
      aprovadoPor: data.aprovadoPor ? String(data.aprovadoPor) : undefined,
      canalAprovacao: data.canalAprovacao
        ? (String(data.canalAprovacao) as Orcamento["canalAprovacao"])
        : undefined,
      mensagemAprovacao: data.mensagemAprovacao ? String(data.mensagemAprovacao) : undefined,
      observacoes: data.observacoes ? String(data.observacoes) : undefined,
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createOrcamentosRepository = (firestore: Firestore | null): OrcamentosRepository => {
  if (firestore) {
    return new FirestoreOrcamentosRepository(firestore);
  }

  return new MemoryOrcamentosRepository();
};
