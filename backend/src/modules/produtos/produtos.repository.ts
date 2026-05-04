import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import type { Produto, ProdutoCategoria, ProdutoInput } from "./produtos.types.js";

const now = () => new Date().toISOString();
const produtosCollection = "produtos";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

const seedProdutos: Produto[] = [
  {
    id: "prd_tela_iphone_13_pro",
    sku: "TLA-IP13P",
    nome: "Tela OLED iPhone 13 Pro",
    categoria: "peca",
    estoqueAtual: 4,
    estoqueMinimo: 2,
    custo: 380,
    precoVenda: 480,
    ativo: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "prd_bateria_redmi_note_12",
    sku: "BAT-RN12",
    nome: "Bateria Redmi Note 12",
    categoria: "peca",
    estoqueAtual: 12,
    estoqueMinimo: 5,
    custo: 70,
    precoVenda: 110,
    ativo: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

export interface ProdutosRepository {
  list(filters?: {
    search?: string;
    categoria?: ProdutoCategoria | "";
    ativo?: boolean | "";
  }): Promise<Produto[]>;
  findById(id: string): Promise<Produto | null>;
  create(input: ProdutoInput): Promise<Produto>;
  update(id: string, input: ProdutoInput): Promise<Produto | null>;
  delete(id: string): Promise<boolean>;
}

const filterProdutos = (
  produtos: Produto[],
  filters: {
    search?: string;
    categoria?: ProdutoCategoria | "";
    ativo?: boolean | "";
  } = {},
) => {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";

  return produtos.filter((produto) => {
    const matchesCategoria =
      !filters.categoria || produto.categoria === filters.categoria;
    const matchesAtivo = filters.ativo === "" || filters.ativo === undefined || produto.ativo === filters.ativo;
    const matchesSearch =
      !normalizedSearch ||
      [produto.sku, produto.nome, produto.categoria, produto.observacoes]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));

    return matchesCategoria && matchesAtivo && matchesSearch;
  });
};

export class MemoryProdutosRepository implements ProdutosRepository {
  private readonly produtos = new Map<string, Produto>(
    seedProdutos.map((produto) => [produto.id, produto]),
  );

  async list(
    filters: {
      search?: string;
      categoria?: ProdutoCategoria | "";
      ativo?: boolean | "";
    } = {},
  ) {
    const produtos = Array.from(this.produtos.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );

    return filterProdutos(produtos, filters);
  }

  async findById(id: string) {
    return this.produtos.get(id) ?? null;
  }

  async create(input: ProdutoInput) {
    const timestamp = now();
    const produto: Produto = {
      id: randomUUID(),
      ...input,
      ativo: input.ativo ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.produtos.set(produto.id, produto);

    return produto;
  }

  async update(id: string, input: ProdutoInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const produto: Produto = {
      ...current,
      ...input,
      ativo: input.ativo ?? current.ativo,
      updatedAt: now(),
    };

    this.produtos.set(id, produto);

    return produto;
  }

  async delete(id: string) {
    return this.produtos.delete(id);
  }
}

export class FirestoreProdutosRepository implements ProdutosRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      search?: string;
      categoria?: ProdutoCategoria | "";
      ativo?: boolean | "";
    } = {},
  ) {
    const snapshot = await this.firestore.collection(produtosCollection).get();

    const produtos = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return filterProdutos(produtos, filters);
  }

  async findById(id: string) {
    const document = await this.firestore.collection(produtosCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    return this.fromDocument(document.id, document.data() ?? {});
  }

  async create(input: ProdutoInput) {
    const timestamp = now();
    const document = this.firestore.collection(produtosCollection).doc();
    const produto: Produto = {
      id: document.id,
      ...input,
      ativo: input.ativo ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await document.set(withoutUndefined(produto));

    return produto;
  }

  async update(id: string, input: ProdutoInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const produto: Produto = {
      ...current,
      ...input,
      ativo: input.ativo ?? current.ativo,
      updatedAt: now(),
    };

    await this.firestore.collection(produtosCollection).doc(id).set(withoutUndefined(produto));

    return produto;
  }

  async delete(id: string) {
    const current = await this.findById(id);

    if (!current) {
      return false;
    }

    await this.firestore.collection(produtosCollection).doc(id).delete();

    return true;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Produto {
    return {
      id,
      sku: String(data.sku ?? ""),
      nome: String(data.nome ?? ""),
      categoria: String(data.categoria ?? "peca") as ProdutoCategoria,
      estoqueAtual: Number(data.estoqueAtual ?? 0),
      estoqueMinimo: Number(data.estoqueMinimo ?? 0),
      custo: Number(data.custo ?? 0),
      precoVenda: Number(data.precoVenda ?? 0),
      ativo: data.ativo !== false,
      observacoes: data.observacoes ? String(data.observacoes) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createProdutosRepository = (firestore: Firestore | null): ProdutosRepository => {
  if (firestore) {
    return new FirestoreProdutosRepository(firestore);
  }

  return new MemoryProdutosRepository();
};
