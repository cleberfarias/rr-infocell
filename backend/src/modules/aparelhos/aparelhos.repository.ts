import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type { Aparelho, AparelhoInput } from "./aparelhos.types.js";

const now = () => new Date().toISOString();
const aparelhosCollection = "aparelhos";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
const getAparelhoTenantId = (a: Aparelho) => a.tenantId ?? DEFAULT_TENANT_ID;

const seedAparelhos: Aparelho[] = [
  {
    id: "apa_iphone_11_marcos",
    clienteId: "cli_marcos_almeida",
    marca: "Apple",
    modelo: "iPhone 11",
    cor: "Preto",
    imeiSerial: "356789012345678",
    estadoFisico: "Tela com riscos leves",
    acessorios: "Sem carregador",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "apa_moto_g_juliana",
    clienteId: "cli_juliana_ramos",
    marca: "Motorola",
    modelo: "Moto G",
    cor: "Azul",
    estadoFisico: "Tampa traseira trincada",
    createdAt: now(),
    updatedAt: now(),
  },
];

export interface AparelhosRepository {
  list(filters?: { search?: string; clienteId?: string }, tenantId?: string): Promise<Aparelho[]>;
  findById(id: string, tenantId?: string): Promise<Aparelho | null>;
  create(input: AparelhoInput, tenantId?: string): Promise<Aparelho>;
  update(id: string, input: AparelhoInput, tenantId?: string): Promise<Aparelho | null>;
  delete(id: string, tenantId?: string): Promise<boolean>;
}

const filterAparelhos = (
  aparelhos: Aparelho[],
  filters: { search?: string; clienteId?: string } = {},
) => {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
  const normalizedClienteId = filters.clienteId?.trim() ?? "";

  return aparelhos.filter((aparelho) => {
    const matchesCliente = !normalizedClienteId || aparelho.clienteId === normalizedClienteId;
    const matchesSearch =
      !normalizedSearch ||
      [aparelho.marca, aparelho.modelo, aparelho.cor, aparelho.imeiSerial, aparelho.estadoFisico]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));

    return matchesCliente && matchesSearch;
  });
};

export class MemoryAparelhosRepository implements AparelhosRepository {
  private readonly aparelhos = new Map<string, Aparelho>(
    seedAparelhos.map((aparelho) => [aparelho.id, aparelho]),
  );

  async list(filters: { search?: string; clienteId?: string } = {}, _tenantId?: string) {
    const aparelhos = Array.from(this.aparelhos.values()).sort((a, b) =>
      `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`, "pt-BR"),
    );

    return filterAparelhos(aparelhos, filters);
  }

  async findById(id: string, _tenantId?: string) {
    return this.aparelhos.get(id) ?? null;
  }

  async create(input: AparelhoInput, tenantId?: string) {
    const timestamp = now();
    const aparelho: Aparelho = {
      id: randomUUID(),
      ...input,
      tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.aparelhos.set(aparelho.id, aparelho);

    return aparelho;
  }

  async update(id: string, input: AparelhoInput, _tenantId?: string) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const aparelho: Aparelho = {
      ...current,
      ...input,
      updatedAt: now(),
    };

    this.aparelhos.set(id, aparelho);

    return aparelho;
  }

  async delete(id: string, _tenantId?: string) {
    return this.aparelhos.delete(id);
  }
}

export class FirestoreAparelhosRepository implements AparelhosRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(filters: { search?: string; clienteId?: string } = {}, tenantId = DEFAULT_TENANT_ID) {
    let query: FirebaseFirestore.Query = this.firestore.collection(aparelhosCollection);

    if (tenantId !== DEFAULT_TENANT_ID) {
      query = query.where("tenantId", "==", tenantId);
    }

    if (filters.clienteId) {
      query = query.where("clienteId", "==", filters.clienteId);
    }

    const snapshot = await query.get();
    const aparelhos = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .filter((a) => getAparelhoTenantId(a) === tenantId)
      .sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`, "pt-BR"));

    return filterAparelhos(aparelhos, filters);
  }

  async findById(id: string, tenantId?: string) {
    const document = await this.firestore.collection(aparelhosCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    const aparelho = this.fromDocument(document.id, document.data() ?? {});

    if (tenantId && getAparelhoTenantId(aparelho) !== tenantId) {
      return null;
    }

    return aparelho;
  }

  async create(input: AparelhoInput, tenantId = DEFAULT_TENANT_ID) {
    const timestamp = now();
    const document = this.firestore.collection(aparelhosCollection).doc();
    const aparelho: Aparelho = {
      id: document.id,
      ...input,
      tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await document.set(withoutUndefined(aparelho));

    return aparelho;
  }

  async update(id: string, input: AparelhoInput, tenantId?: string) {
    const current = await this.findById(id, tenantId);

    if (!current) {
      return null;
    }

    const aparelho: Aparelho = {
      ...current,
      ...input,
      updatedAt: now(),
    };

    await this.firestore.collection(aparelhosCollection).doc(id).set(withoutUndefined(aparelho));

    return aparelho;
  }

  async delete(id: string, tenantId?: string) {
    const current = await this.findById(id, tenantId);

    if (!current) {
      return false;
    }

    await this.firestore.collection(aparelhosCollection).doc(id).delete();

    return true;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Aparelho {
    return {
      id,
      clienteId: String(data.clienteId ?? ""),
      marca: String(data.marca ?? ""),
      modelo: String(data.modelo ?? ""),
      cor: data.cor ? String(data.cor) : undefined,
      imeiSerial: data.imeiSerial ? String(data.imeiSerial) : undefined,
      estadoFisico: data.estadoFisico ? String(data.estadoFisico) : undefined,
      acessorios: data.acessorios ? String(data.acessorios) : undefined,
      observacoes: data.observacoes ? String(data.observacoes) : undefined,
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createAparelhosRepository = (firestore: Firestore | null): AparelhosRepository => {
  if (firestore) {
    return new FirestoreAparelhosRepository(firestore);
  }

  return new MemoryAparelhosRepository();
};
