import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
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
  }, tenantId?: string): Promise<Produto[]>;
  findById(id: string, tenantId?: string): Promise<Produto | null>;
  create(input: ProdutoInput, tenantId?: string): Promise<Produto>;
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
    const matchesCategoria = !filters.categoria || produto.categoria === filters.categoria;
    const matchesAtivo =
      filters.ativo === "" || filters.ativo === undefined || produto.ativo === filters.ativo;
    const matchesSearch =
      !normalizedSearch ||
      [
        produto.sku,
        produto.nome,
        produto.categoria,
        produto.imei,
        produto.marca,
        produto.fornecedor,
        produto.codigoFornecedor,
        produto.modelo,
        produto.observacoes,
      ]
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
    _tenantId?: string,
  ) {
    const produtos = Array.from(this.produtos.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );

    return filterProdutos(produtos, filters);
  }

  async findById(id: string, _tenantId?: string) {
    return this.produtos.get(id) ?? null;
  }

  async create(input: ProdutoInput, _tenantId?: string) {
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
    tenantId = DEFAULT_TENANT_ID,
  ) {
    const snapshot = await this.firestore
      .collection(produtosCollection)
      .where("tenantId", "==", tenantId)
      .get();

    const produtos = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return filterProdutos(produtos, filters);
  }

  async findById(id: string, tenantId?: string) {
    const document = await this.firestore.collection(produtosCollection).doc(id).get();

    if (!document.exists) {
      if (process.env.DEBUG_TENANT_LOOKUP === "true") {
        console.log(`[TENANT_LOOKUP] findById id=${id} tenantId=${tenantId} result=not_found_in_firestore`);
      }
      return null;
    }

    const produto = this.fromDocument(document.id, document.data() ?? {});

    if (tenantId && produto.tenantId && produto.tenantId !== tenantId) {
      if (process.env.DEBUG_TENANT_LOOKUP === "true") {
        console.log(`[TENANT_LOOKUP] findById id=${id} tenantId_received=${tenantId} tenantId_doc=${produto.tenantId} result=tenant_mismatch`);
      }
      return null;
    }

    if (process.env.DEBUG_TENANT_LOOKUP === "true") {
      console.log(`[TENANT_LOOKUP] findById id=${id} tenantId_received=${tenantId} tenantId_doc=${produto.tenantId} result=found`);
    }

    return produto;
  }

  async create(input: ProdutoInput, tenantId = DEFAULT_TENANT_ID) {
    const timestamp = now();
    const document = this.firestore.collection(produtosCollection).doc();
    const produto: Produto = {
      id: document.id,
      ...input,
      ativo: input.ativo ?? true,
      tenantId,
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
      tenantId: current.tenantId ?? DEFAULT_TENANT_ID,
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
      marca: data.marca ? String(data.marca) : undefined,
      fornecedor: data.fornecedor ? String(data.fornecedor) : undefined,
      codigoFornecedor: data.codigoFornecedor ? String(data.codigoFornecedor) : undefined,
      modelo: data.modelo ? String(data.modelo) : undefined,
      imei: data.imei ? String(data.imei) : undefined,
      cor: data.cor ? String(data.cor) : undefined,
      capacidade: data.capacidade ? String(data.capacidade) : undefined,
      estadoConservacao: data.estadoConservacao ? String(data.estadoConservacao) : undefined,
      saudeBateria: data.saudeBateria !== undefined ? Number(data.saudeBateria) : undefined,
      origem: data.origem ? (String(data.origem) as Produto["origem"]) : undefined,
      garantiaDias: data.garantiaDias !== undefined ? Number(data.garantiaDias) : undefined,
      laudoEntrada: data.laudoEntrada ? String(data.laudoEntrada) : undefined,
      custoRestauracao:
        data.custoRestauracao !== undefined ? Number(data.custoRestauracao) : undefined,
      observacoes: data.observacoes ? String(data.observacoes) : undefined,
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
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
