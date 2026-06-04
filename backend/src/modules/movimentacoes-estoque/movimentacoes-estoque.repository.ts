import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type {
  MovimentacaoEstoque,
  MovimentacaoEstoqueTipo,
} from "./movimentacoes-estoque.types.js";

const movimentacoesCollection = "movimentacoesEstoque";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
const getMovimentacaoTenantId = (movimentacao: MovimentacaoEstoque) =>
  movimentacao.tenantId ?? DEFAULT_TENANT_ID;

export interface MovimentacoesEstoqueRepository {
  list(
    filters?: {
      produtoId?: string;
      tipo?: MovimentacaoEstoqueTipo | "";
    },
    tenantId?: string,
  ): Promise<MovimentacaoEstoque[]>;
  create(input: Omit<MovimentacaoEstoque, "id">): Promise<MovimentacaoEstoque>;
}

const filterMovimentacoes = (
  movimentacoes: MovimentacaoEstoque[],
  filters: {
    produtoId?: string;
    tipo?: MovimentacaoEstoqueTipo | "";
  } = {},
) =>
  movimentacoes.filter((movimentacao) => {
    const matchesProduto = !filters.produtoId || movimentacao.produtoId === filters.produtoId;
    const matchesTipo = !filters.tipo || movimentacao.tipo === filters.tipo;

    return matchesProduto && matchesTipo;
  });

export class MemoryMovimentacoesEstoqueRepository implements MovimentacoesEstoqueRepository {
  private readonly movimentacoes = new Map<string, MovimentacaoEstoque>();

  async list(
    filters: {
      produtoId?: string;
      tipo?: MovimentacaoEstoqueTipo | "";
    } = {},
    _tenantId?: string,
  ) {
    const movimentacoes = Array.from(this.movimentacoes.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    return filterMovimentacoes(movimentacoes, filters);
  }

  async create(input: Omit<MovimentacaoEstoque, "id">) {
    const movimentacao: MovimentacaoEstoque = {
      id: randomUUID(),
      ...input,
    };

    this.movimentacoes.set(movimentacao.id, movimentacao);

    return movimentacao;
  }
}

export class FirestoreMovimentacoesEstoqueRepository implements MovimentacoesEstoqueRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      produtoId?: string;
      tipo?: MovimentacaoEstoqueTipo | "";
    } = {},
    tenantId = DEFAULT_TENANT_ID,
  ) {
    let query: FirebaseFirestore.Query = this.firestore.collection(movimentacoesCollection);

    if (tenantId !== DEFAULT_TENANT_ID) {
      query = query.where("tenantId", "==", tenantId);
    }

    const snapshot = await query.get();
    const movimentacoes = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .filter((movimentacao) => getMovimentacaoTenantId(movimentacao) === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return filterMovimentacoes(movimentacoes, filters);
  }

  async create(input: Omit<MovimentacaoEstoque, "id">) {
    const document = this.firestore.collection(movimentacoesCollection).doc();
    const movimentacao: MovimentacaoEstoque = {
      id: document.id,
      ...input,
    };

    await document.set(withoutUndefined(movimentacao));

    return movimentacao;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): MovimentacaoEstoque {
    return {
      id,
      produtoId: String(data.produtoId ?? ""),
      produtoNome: String(data.produtoNome ?? ""),
      produtoSku: String(data.produtoSku ?? ""),
      tipo: String(data.tipo ?? "entrada") as MovimentacaoEstoqueTipo,
      quantidade: Number(data.quantidade ?? 0),
      estoqueAnterior: Number(data.estoqueAnterior ?? 0),
      estoquePosterior: Number(data.estoquePosterior ?? 0),
      motivo: data.motivo ? String(data.motivo) : undefined,
      origem: data.origem === "ordem_servico" ? "ordem_servico" : "manual",
      ordemServicoId: data.ordemServicoId ? String(data.ordemServicoId) : undefined,
      criadoPor: data.criadoPor ? String(data.criadoPor) : undefined,
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
      createdAt: String(data.createdAt ?? ""),
    };
  }
}

export const createMovimentacoesEstoqueRepository = (
  firestore: Firestore | null,
): MovimentacoesEstoqueRepository => {
  if (firestore) {
    return new FirestoreMovimentacoesEstoqueRepository(firestore);
  }

  return new MemoryMovimentacoesEstoqueRepository();
};
