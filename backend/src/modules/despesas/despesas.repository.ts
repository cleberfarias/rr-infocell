import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type { Despesa, DespesaCategoria, DespesaInput } from "./despesas.types.js";

const now = () => new Date().toISOString();
const despesasCollection = "despesas";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

const seedDespesas: Despesa[] = [
  {
    id: "dsp_aluguel",
    descricao: "Aluguel da loja",
    categoria: "aluguel",
    fornecedor: "Imobiliaria Centro",
    valor: 2200,
    vencimento: "05/05",
    recorrente: true,
    pago: true,
    pagoEm: now(),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "dsp_energia",
    descricao: "Energia eletrica",
    categoria: "luz",
    fornecedor: "Enel SP",
    valor: 540,
    vencimento: "10/05",
    recorrente: true,
    pago: true,
    pagoEm: now(),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "dsp_internet",
    descricao: "Internet fibra",
    categoria: "internet",
    fornecedor: "Vivo Empresas",
    valor: 199,
    vencimento: "15/05",
    recorrente: true,
    pago: false,
    createdAt: now(),
    updatedAt: now(),
  },
];

export interface DespesasRepository {
  list(filters?: {
    search?: string;
    categoria?: DespesaCategoria | "";
    pago?: boolean | "";
  }, tenantId?: string): Promise<Despesa[]>;
  findById(id: string): Promise<Despesa | null>;
  create(input: DespesaInput, tenantId?: string): Promise<Despesa>;
  update(id: string, input: DespesaInput): Promise<Despesa | null>;
  delete(id: string): Promise<boolean>;
}

const buildDespesa = (input: DespesaInput, current?: Despesa): Despesa => {
  const timestamp = now();
  const pago = input.pago ?? current?.pago ?? false;
  const paidNow = pago && !current?.pago;

  return {
    id: current?.id ?? randomUUID(),
    descricao: input.descricao,
    categoria: input.categoria,
    fornecedor: input.fornecedor,
    valor: input.valor,
    vencimento: input.vencimento,
    recorrente: input.recorrente ?? current?.recorrente ?? false,
    pago,
    pagoEm: paidNow ? timestamp : pago ? current?.pagoEm : undefined,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};

const filterDespesas = (
  despesas: Despesa[],
  filters: {
    search?: string;
    categoria?: DespesaCategoria | "";
    pago?: boolean | "";
  } = {},
) => {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";

  return despesas.filter((despesa) => {
    const matchesCategoria = !filters.categoria || despesa.categoria === filters.categoria;
    const matchesPago =
      filters.pago === "" || filters.pago === undefined || despesa.pago === filters.pago;
    const matchesSearch =
      !normalizedSearch ||
      [despesa.descricao, despesa.categoria, despesa.fornecedor]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));

    return matchesCategoria && matchesPago && matchesSearch;
  });
};

export class MemoryDespesasRepository implements DespesasRepository {
  private readonly despesas = new Map<string, Despesa>(
    seedDespesas.map((despesa) => [despesa.id, despesa]),
  );

  async list(
    filters: {
      search?: string;
      categoria?: DespesaCategoria | "";
      pago?: boolean | "";
    } = {},
    _tenantId?: string,
  ) {
    const despesas = Array.from(this.despesas.values()).sort((a, b) =>
      a.vencimento.localeCompare(b.vencimento, "pt-BR"),
    );

    return filterDespesas(despesas, filters);
  }

  async findById(id: string) {
    return this.despesas.get(id) ?? null;
  }

  async create(input: DespesaInput, _tenantId?: string) {
    const despesa = buildDespesa(input);

    this.despesas.set(despesa.id, despesa);

    return despesa;
  }

  async update(id: string, input: DespesaInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const despesa = buildDespesa(input, current);

    this.despesas.set(id, despesa);

    return despesa;
  }

  async delete(id: string) {
    return this.despesas.delete(id);
  }
}

export class FirestoreDespesasRepository implements DespesasRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      search?: string;
      categoria?: DespesaCategoria | "";
      pago?: boolean | "";
    } = {},
    tenantId = DEFAULT_TENANT_ID,
  ) {
    const snapshot = await this.firestore
      .collection(despesasCollection)
      .where("tenantId", "==", tenantId)
      .get();
    const despesas = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento, "pt-BR"));

    return filterDespesas(despesas, filters);
  }

  async findById(id: string) {
    const document = await this.firestore.collection(despesasCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    return this.fromDocument(document.id, document.data() ?? {});
  }

  async create(input: DespesaInput, tenantId = DEFAULT_TENANT_ID) {
    const document = this.firestore.collection(despesasCollection).doc();
    const despesa = {
      ...buildDespesa(input),
      id: document.id,
      tenantId,
    };

    await document.set(withoutUndefined(despesa));

    return despesa;
  }

  async update(id: string, input: DespesaInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const despesa = {
      ...buildDespesa(input, current),
      tenantId: current.tenantId ?? DEFAULT_TENANT_ID,
    };

    await this.firestore.collection(despesasCollection).doc(id).set(withoutUndefined(despesa));

    return despesa;
  }

  async delete(id: string) {
    const current = await this.findById(id);

    if (!current) {
      return false;
    }

    await this.firestore.collection(despesasCollection).doc(id).delete();

    return true;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Despesa {
    return {
      id,
      descricao: String(data.descricao ?? ""),
      categoria: String(data.categoria ?? "outros") as DespesaCategoria,
      fornecedor: data.fornecedor ? String(data.fornecedor) : undefined,
      valor: Number(data.valor ?? 0),
      vencimento: String(data.vencimento ?? ""),
      recorrente: data.recorrente === true,
      pago: data.pago === true,
      pagoEm: data.pagoEm ? String(data.pagoEm) : undefined,
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createDespesasRepository = (firestore: Firestore | null): DespesasRepository => {
  if (firestore) {
    return new FirestoreDespesasRepository(firestore);
  }

  return new MemoryDespesasRepository();
};
