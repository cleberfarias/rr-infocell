import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type {
  Checklist,
  ChecklistFoto,
  ChecklistInput,
  ChecklistItem,
} from "./checklists.types.js";

const now = () => new Date().toISOString();
const checklistsCollection = "checklists";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
const getChecklistTenantId = (c: Checklist) => c.tenantId ?? DEFAULT_TENANT_ID;

export interface ChecklistsRepository {
  list(
    filters?: { ordemServicoId?: string; aparelhoId?: string; tipo?: Checklist["tipo"] | "" },
    tenantId?: string,
  ): Promise<Checklist[]>;
  findById(id: string, tenantId?: string): Promise<Checklist | null>;
  create(input: ChecklistInput, tenantId?: string): Promise<Checklist>;
  update(id: string, input: ChecklistInput, tenantId?: string): Promise<Checklist | null>;
  delete(id: string, tenantId?: string): Promise<boolean>;
}

const filterChecklists = (
  checklists: Checklist[],
  filters: { ordemServicoId?: string; aparelhoId?: string; tipo?: Checklist["tipo"] | "" } = {},
) =>
  checklists.filter((checklist) => {
    const matchesOrdem =
      !filters.ordemServicoId || checklist.ordemServicoId === filters.ordemServicoId;
    const matchesAparelho = !filters.aparelhoId || checklist.aparelhoId === filters.aparelhoId;
    const matchesTipo = !filters.tipo || checklist.tipo === filters.tipo;

    return matchesOrdem && matchesAparelho && matchesTipo;
  });

const normalizeItens = (itens: ChecklistItem[]) =>
  itens.map((item) => withoutUndefined({ ...item }));

const normalizeFotos = (fotos: ChecklistFoto[] = []) =>
  fotos.map((foto) => withoutUndefined({ ...foto }));

export class MemoryChecklistsRepository implements ChecklistsRepository {
  private readonly checklists = new Map<string, Checklist>();

  async list(
    filters: { ordemServicoId?: string; aparelhoId?: string; tipo?: Checklist["tipo"] | "" } = {},
    _tenantId?: string,
  ) {
    const checklists = Array.from(this.checklists.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    return filterChecklists(checklists, filters);
  }

  async findById(id: string, _tenantId?: string) {
    return this.checklists.get(id) ?? null;
  }

  async create(input: ChecklistInput, tenantId?: string) {
    const timestamp = now();
    const checklist: Checklist = {
      id: randomUUID(),
      ...input,
      tipo: input.tipo ?? "entrada",
      itens: normalizeItens(input.itens),
      fotos: normalizeFotos(input.fotos),
      tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.checklists.set(checklist.id, checklist);

    return checklist;
  }

  async update(id: string, input: ChecklistInput, _tenantId?: string) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const checklist: Checklist = {
      ...current,
      ...input,
      itens: normalizeItens(input.itens),
      fotos: normalizeFotos(input.fotos),
      updatedAt: now(),
    };

    this.checklists.set(id, checklist);

    return checklist;
  }

  async delete(id: string, _tenantId?: string) {
    return this.checklists.delete(id);
  }
}

export class FirestoreChecklistsRepository implements ChecklistsRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: { ordemServicoId?: string; aparelhoId?: string; tipo?: Checklist["tipo"] | "" } = {},
    tenantId = DEFAULT_TENANT_ID,
  ) {
    let query: FirebaseFirestore.Query = this.firestore.collection(checklistsCollection);

    if (tenantId !== DEFAULT_TENANT_ID) {
      query = query.where("tenantId", "==", tenantId);
    }

    if (filters.ordemServicoId) {
      query = query.where("ordemServicoId", "==", filters.ordemServicoId);
    }

    if (filters.aparelhoId) {
      query = query.where("aparelhoId", "==", filters.aparelhoId);
    }

    if (filters.tipo) {
      query = query.where("tipo", "==", filters.tipo);
    }

    const snapshot = await query.get();

    return snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .filter((c) => getChecklistTenantId(c) === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string, tenantId?: string) {
    const document = await this.firestore.collection(checklistsCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    const checklist = this.fromDocument(document.id, document.data() ?? {});

    if (tenantId && getChecklistTenantId(checklist) !== tenantId) {
      return null;
    }

    return checklist;
  }

  async create(input: ChecklistInput, tenantId = DEFAULT_TENANT_ID) {
    const timestamp = now();
    const document = this.firestore.collection(checklistsCollection).doc();
    const checklist: Checklist = {
      id: document.id,
      ...input,
      tipo: input.tipo ?? "entrada",
      itens: normalizeItens(input.itens),
      fotos: normalizeFotos(input.fotos),
      tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await document.set(withoutUndefined(checklist));

    return checklist;
  }

  async update(id: string, input: ChecklistInput, tenantId?: string) {
    const current = await this.findById(id, tenantId);

    if (!current) {
      return null;
    }

    const checklist: Checklist = {
      ...current,
      ...input,
      itens: normalizeItens(input.itens),
      fotos: normalizeFotos(input.fotos),
      updatedAt: now(),
    };

    await this.firestore.collection(checklistsCollection).doc(id).set(withoutUndefined(checklist));

    return checklist;
  }

  async delete(id: string, tenantId?: string) {
    const current = await this.findById(id, tenantId);

    if (!current) {
      return false;
    }

    await this.firestore.collection(checklistsCollection).doc(id).delete();

    return true;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Checklist {
    return {
      id,
      ordemServicoId: String(data.ordemServicoId ?? ""),
      aparelhoId: String(data.aparelhoId ?? ""),
      tipo: String(data.tipo ?? "entrada") as Checklist["tipo"],
      itens: Array.isArray(data.itens)
        ? data.itens.map((item) => ({
            nome: String(item.nome ?? ""),
            status: String(item.status ?? "nao_testado") as ChecklistItem["status"],
            observacao: item.observacao ? String(item.observacao) : undefined,
          }))
        : [],
      fotos: Array.isArray(data.fotos)
        ? data.fotos.map((foto) => ({
            nome: String(foto.nome ?? ""),
            url: String(foto.url ?? ""),
            path: String(foto.path ?? ""),
            contentType: foto.contentType ? String(foto.contentType) : undefined,
            uploadedAt: String(foto.uploadedAt ?? ""),
          }))
        : [],
      observacoesGerais: data.observacoesGerais ? String(data.observacoesGerais) : undefined,
      criadoPor: data.criadoPor ? String(data.criadoPor) : undefined,
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createChecklistsRepository = (firestore: Firestore | null): ChecklistsRepository => {
  if (firestore) {
    return new FirestoreChecklistsRepository(firestore);
  }

  return new MemoryChecklistsRepository();
};
