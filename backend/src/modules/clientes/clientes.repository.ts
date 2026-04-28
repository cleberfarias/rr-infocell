import { randomUUID } from "node:crypto";

import type { Cliente, ClienteInput } from "./clientes.types.js";

const now = () => new Date().toISOString();

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

export class ClientesRepository {
  private readonly clientes = new Map<string, Cliente>(
    seedClientes.map((cliente) => [cliente.id, cliente]),
  );

  list(search = "") {
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

  findById(id: string) {
    return this.clientes.get(id) ?? null;
  }

  create(input: ClienteInput) {
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

  update(id: string, input: ClienteInput) {
    const current = this.findById(id);

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

  delete(id: string) {
    return this.clientes.delete(id);
  }
}

export const clientesRepository = new ClientesRepository();
