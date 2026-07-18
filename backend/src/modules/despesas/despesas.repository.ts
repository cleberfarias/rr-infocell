import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type { Despesa, DespesaCategoria, DespesaInput } from "./despesas.types.js";

const now = () => new Date().toISOString();
const despesasCollection = "despesas";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
const getDespesaTenantId = (despesa: Despesa) => despesa.tenantId ?? DEFAULT_TENANT_ID;

const seedDespesas: Despesa[] = [
  {
    id: "dsp_aluguel",
    descricao: "Aluguel da loja",
    categoria: "aluguel",
    fornecedor: "Imobiliaria Centro",
    valor: 2200,
    vencimento: "05/05",
    recorrente: true,
    tipoLancamento: "fixa",
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
    tipoLancamento: "fixa",
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
    tipoLancamento: "fixa",
    pago: false,
    createdAt: now(),
    updatedAt: now(),
  },
];

export interface DespesasRepository {
  list(
    filters?: {
      search?: string;
      categoria?: DespesaCategoria | "";
      pago?: boolean | "";
    },
    tenantId?: string,
  ): Promise<Despesa[]>;
  findById(id: string, tenantId?: string): Promise<Despesa | null>;
  create(input: DespesaInput, tenantId?: string): Promise<Despesa>;
  createRecurrence(input: DespesaInput, tenantId?: string): Promise<Despesa>;
  update(id: string, input: DespesaInput, tenantId?: string): Promise<Despesa | null>;
  delete(id: string, tenantId?: string): Promise<boolean>;
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
    tipoLancamento:
      input.tipoLancamento ??
      current?.tipoLancamento ??
      ((input.recorrente ?? current?.recorrente) ? "fixa" : "unica"),
    totalParcelas:
      input.tipoLancamento === "unica"
        ? undefined
        : (input.totalParcelas ?? current?.totalParcelas),
    pago,
    pagoEm: paidNow ? timestamp : pago ? current?.pagoEm : undefined,
    recorrenciaOrigemId:
      input.tipoLancamento === "unica"
        ? undefined
        : (input.recorrenciaOrigemId ?? current?.recorrenciaOrigemId),
    recorrenciaIndice:
      input.tipoLancamento === "unica"
        ? undefined
        : (input.recorrenciaIndice ?? current?.recorrenciaIndice),
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

  async findById(id: string, _tenantId?: string) {
    return this.despesas.get(id) ?? null;
  }

  async create(input: DespesaInput, _tenantId?: string) {
    const despesa = buildDespesa(input);

    this.despesas.set(despesa.id, despesa);

    return despesa;
  }

  async createRecurrence(input: DespesaInput, tenantId?: string) {
    const existing = Array.from(this.despesas.values()).find(
      (despesa) =>
        despesa.recorrenciaOrigemId === input.recorrenciaOrigemId &&
        despesa.recorrenciaIndice === input.recorrenciaIndice,
    );

    return existing ?? this.create(input, tenantId);
  }

  async update(id: string, input: DespesaInput, tenantId?: string) {
    const current = await this.findById(id, tenantId);

    if (!current) {
      return null;
    }

    const despesa = buildDespesa(input, current);

    this.despesas.set(id, despesa);

    return despesa;
  }

  async delete(id: string, _tenantId?: string) {
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
    let query: FirebaseFirestore.Query = this.firestore.collection(despesasCollection);

    if (tenantId !== DEFAULT_TENANT_ID) {
      query = query.where("tenantId", "==", tenantId);
    }

    const snapshot = await query.get();
    const despesas = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .filter((despesa) => getDespesaTenantId(despesa) === tenantId)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento, "pt-BR"));

    return filterDespesas(despesas, filters);
  }

  async findById(id: string, tenantId?: string) {
    const document = await this.firestore.collection(despesasCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    const despesa = this.fromDocument(document.id, document.data() ?? {});

    if (tenantId && getDespesaTenantId(despesa) !== tenantId) {
      return null;
    }

    return despesa;
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

  async createRecurrence(input: DespesaInput, tenantId = DEFAULT_TENANT_ID) {
    const originId = input.recorrenciaOrigemId;
    const index = input.recorrenciaIndice;

    if (!originId || index === undefined) {
      return this.create(input, tenantId);
    }

    // A deterministic document prevents duplicate installments when two Cloud Run
    // requests materialize the same competence at the same time.
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const document = this.firestore
      .collection(despesasCollection)
      .doc(`rec_${safeTenantId}_${originId}_${index}`);

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(document);
      if (snapshot.exists) {
        return this.fromDocument(snapshot.id, snapshot.data() ?? {});
      }

      const despesa = {
        ...buildDespesa(input),
        id: document.id,
        tenantId,
      };
      transaction.create(document, withoutUndefined(despesa));
      return despesa;
    });
  }

  async update(id: string, input: DespesaInput, tenantId?: string) {
    const current = await this.findById(id, tenantId);

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

  async delete(id: string, tenantId?: string) {
    const current = await this.findById(id, tenantId);

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
      tipoLancamento:
        data.tipoLancamento === "parcelada" || data.tipoLancamento === "unica"
          ? data.tipoLancamento
          : data.recorrente === true
            ? "fixa"
            : "unica",
      totalParcelas: data.totalParcelas !== undefined ? Number(data.totalParcelas) : undefined,
      pago: data.pago === true,
      pagoEm: data.pagoEm ? String(data.pagoEm) : undefined,
      recorrenciaOrigemId: data.recorrenciaOrigemId ? String(data.recorrenciaOrigemId) : undefined,
      recorrenciaIndice:
        data.recorrenciaIndice !== undefined ? Number(data.recorrenciaIndice) : undefined,
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
