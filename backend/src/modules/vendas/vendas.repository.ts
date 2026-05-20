import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import type { Venda, VendaStatus } from "./vendas.types.js";

const vendasCollection = "vendas";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

export interface VendasRepository {
  list(filters?: { ordemServicoId?: string; status?: VendaStatus | "" }): Promise<Venda[]>;
  findByOrdem(ordemServicoId: string): Promise<Venda | null>;
  create(input: Omit<Venda, "id">): Promise<Venda>;
}

const filterVendas = (
  vendas: Venda[],
  filters: {
    ordemServicoId?: string;
    status?: VendaStatus | "";
  } = {},
) =>
  vendas.filter((venda) => {
    const matchesOrdem = !filters.ordemServicoId || venda.ordemServicoId === filters.ordemServicoId;
    const matchesStatus = !filters.status || venda.status === filters.status;

    return matchesOrdem && matchesStatus;
  });

export class MemoryVendasRepository implements VendasRepository {
  private readonly vendas = new Map<string, Venda>();

  async list(
    filters: {
      ordemServicoId?: string;
      status?: VendaStatus | "";
    } = {},
  ) {
    const vendas = Array.from(this.vendas.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    return filterVendas(vendas, filters);
  }

  async findByOrdem(ordemServicoId: string) {
    const [venda] = await this.list({ ordemServicoId, status: "finalizada" });

    return venda ?? null;
  }

  async create(input: Omit<Venda, "id">) {
    const venda: Venda = {
      id: randomUUID(),
      ...input,
    };

    this.vendas.set(venda.id, venda);

    return venda;
  }
}

export class FirestoreVendasRepository implements VendasRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      ordemServicoId?: string;
      status?: VendaStatus | "";
    } = {},
  ) {
    let query: FirebaseFirestore.Query = this.firestore.collection(vendasCollection);

    if (filters.ordemServicoId) {
      query = query.where("ordemServicoId", "==", filters.ordemServicoId);
    }

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    const snapshot = await query.get();
    const vendas = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return filterVendas(vendas, filters);
  }

  async findByOrdem(ordemServicoId: string) {
    const [venda] = await this.list({ ordemServicoId, status: "finalizada" });

    return venda ?? null;
  }

  async create(input: Omit<Venda, "id">) {
    const document = this.firestore.collection(vendasCollection).doc();
    const venda: Venda = {
      id: document.id,
      ...input,
    };

    await document.set(withoutUndefined(venda));

    return venda;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Venda {
    return {
      id,
      tipo: String(data.tipo ?? "ordem_servico") as Venda["tipo"],
      ordemServicoId: data.ordemServicoId ? String(data.ordemServicoId) : undefined,
      numeroOs: data.numeroOs !== undefined ? Number(data.numeroOs) : undefined,
      clienteId: data.clienteId ? String(data.clienteId) : undefined,
      clienteNome: data.clienteNome ? String(data.clienteNome) : undefined,
      aparelhoId: data.aparelhoId ? String(data.aparelhoId) : undefined,
      itens: Array.isArray(data.itens)
        ? data.itens.map((item) => ({
            produtoId: String(item.produtoId ?? ""),
            sku: String(item.sku ?? ""),
            nome: String(item.nome ?? ""),
            categoria: item.categoria ? String(item.categoria) : undefined,
            imei: item.imei ? String(item.imei) : undefined,
            quantidade: Number(item.quantidade ?? 0),
            valorUnitario: Number(item.valorUnitario ?? 0),
            valorTotal: Number(item.valorTotal ?? 0),
            garantiaDias: item.garantiaDias !== undefined ? Number(item.garantiaDias) : undefined,
            garantiaAte: item.garantiaAte ? String(item.garantiaAte) : undefined,
          }))
        : [],
      valorPecas: Number(data.valorPecas ?? 0),
      valorMaoObra: Number(data.valorMaoObra ?? 0),
      desconto: data.desconto !== undefined ? Number(data.desconto) : undefined,
      valorTotal: Number(data.valorTotal ?? 0),
      formaPagamento: String(data.formaPagamento ?? "pix") as Venda["formaPagamento"],
      valorRecebido: Number(data.valorRecebido ?? 0),
      troco: Number(data.troco ?? 0),
      status: String(data.status ?? "finalizada") as VendaStatus,
      createdAt: String(data.createdAt ?? ""),
    };
  }
}

export const createVendasRepository = (firestore: Firestore | null): VendasRepository => {
  if (firestore) {
    return new FirestoreVendasRepository(firestore);
  }

  return new MemoryVendasRepository();
};
