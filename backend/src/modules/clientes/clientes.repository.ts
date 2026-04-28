import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import type { Cliente, ClienteInput } from "./clientes.types.js";

const now = () => new Date().toISOString();
const clientesCollection = "clientes";

const seedClientes: Cliente[] = [
  {
    id: "cli_marcos_almeida",
    nome: "Marcos Almeida",
    telefone: "(11) 98432-1290",
    documento: "123.456.789-00",
    email: "marcos@example.com",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "cli_juliana_ramos",
    nome: "Juliana Ramos",
    telefone: "(11) 99102-5511",
    documento: "987.654.321-00",
    email: "juliana@example.com",
    createdAt: now(),
    updatedAt: now(),
  },
];

export interface ClientesRepository {
  list(search?: string): Promise<Cliente[]>;
  findById(id: string): Promise<Cliente | null>;
  create(input: ClienteInput): Promise<Cliente>;
  update(id: string, input: ClienteInput): Promise<Cliente | null>;
  delete(id: string): Promise<boolean>;
}

export class MemoryClientesRepository implements ClientesRepository {
  private readonly clientes = new Map<string, Cliente>(
    seedClientes.map((cliente) => [cliente.id, cliente]),
  );

  async list(search = "") {
    const normalizedSearch = search.trim().toLowerCase();
    const clientes = Array.from(this.clientes.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );

    if (!normalizedSearch) {
      return clientes;
    }

    return clientes.filter((cliente) =>
      [cliente.nome, cliente.telefone, cliente.documento, cliente.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }

  async findById(id: string) {
    return this.clientes.get(id) ?? null;
  }

  async create(input: ClienteInput) {
    const timestamp = now();
    const cliente: Cliente = {
      id: randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.clientes.set(cliente.id, cliente);

    return cliente;
  }

  async update(id: string, input: ClienteInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const cliente: Cliente = {
      ...current,
      ...input,
      updatedAt: now(),
    };

    this.clientes.set(id, cliente);

    return cliente;
  }

  async delete(id: string) {
    return this.clientes.delete(id);
  }
}

export class FirestoreClientesRepository implements ClientesRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(search = "") {
    const snapshot = await this.firestore.collection(clientesCollection).get();
    const clientes = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return clientes;
    }

    return clientes.filter((cliente) =>
      [cliente.nome, cliente.telefone, cliente.documento, cliente.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }

  async findById(id: string) {
    const document = await this.firestore.collection(clientesCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    return this.fromDocument(document.id, document.data() ?? {});
  }

  async create(input: ClienteInput) {
    const timestamp = now();
    const document = this.firestore.collection(clientesCollection).doc();
    const cliente: Cliente = {
      id: document.id,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await document.set(cliente);

    return cliente;
  }

  async update(id: string, input: ClienteInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const cliente: Cliente = {
      ...current,
      ...input,
      updatedAt: now(),
    };

    await this.firestore.collection(clientesCollection).doc(id).set(cliente);

    return cliente;
  }

  async delete(id: string) {
    const current = await this.findById(id);

    if (!current) {
      return false;
    }

    await this.firestore.collection(clientesCollection).doc(id).delete();

    return true;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): Cliente {
    return {
      id,
      nome: String(data.nome ?? ""),
      telefone: String(data.telefone ?? ""),
      documento: data.documento ? String(data.documento) : undefined,
      email: data.email ? String(data.email) : undefined,
      endereco: data.endereco ? String(data.endereco) : undefined,
      observacoes: data.observacoes ? String(data.observacoes) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createClientesRepository = (firestore: Firestore | null): ClientesRepository => {
  if (firestore) {
    return new FirestoreClientesRepository(firestore);
  }

  return new MemoryClientesRepository();
};
