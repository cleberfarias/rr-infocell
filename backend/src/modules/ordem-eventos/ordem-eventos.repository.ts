import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import type { OrdemEvento, OrdemEventoTipo } from "./ordem-eventos.types.js";

const eventosCollection = "ordemEventos";
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;

export interface OrdemEventosRepository {
  list(filters?: {
    ordemServicoId?: string;
    tipo?: OrdemEventoTipo | "";
  }): Promise<OrdemEvento[]>;
  create(input: Omit<OrdemEvento, "id">): Promise<OrdemEvento>;
}

const filterEventos = (
  eventos: OrdemEvento[],
  filters: {
    ordemServicoId?: string;
    tipo?: OrdemEventoTipo | "";
  } = {},
) =>
  eventos.filter((evento) => {
    const matchesOrdem =
      !filters.ordemServicoId || evento.ordemServicoId === filters.ordemServicoId;
    const matchesTipo = !filters.tipo || evento.tipo === filters.tipo;

    return matchesOrdem && matchesTipo;
  });

export class MemoryOrdemEventosRepository implements OrdemEventosRepository {
  private readonly eventos = new Map<string, OrdemEvento>();

  async list(
    filters: {
      ordemServicoId?: string;
      tipo?: OrdemEventoTipo | "";
    } = {},
  ) {
    const eventos = Array.from(this.eventos.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    return filterEventos(eventos, filters);
  }

  async create(input: Omit<OrdemEvento, "id">) {
    const evento: OrdemEvento = {
      id: randomUUID(),
      ...input,
    };

    this.eventos.set(evento.id, evento);

    return evento;
  }
}

export class FirestoreOrdemEventosRepository implements OrdemEventosRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      ordemServicoId?: string;
      tipo?: OrdemEventoTipo | "";
    } = {},
  ) {
    let query: FirebaseFirestore.Query =
      this.firestore.collection(eventosCollection);

    if (filters.ordemServicoId) {
      query = query.where("ordemServicoId", "==", filters.ordemServicoId);
    }

    if (filters.tipo) {
      query = query.where("tipo", "==", filters.tipo);
    }

    const snapshot = await query.get();
    const eventos = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return filterEventos(eventos, filters);
  }

  async create(input: Omit<OrdemEvento, "id">) {
    const document = this.firestore.collection(eventosCollection).doc();
    const evento: OrdemEvento = {
      id: document.id,
      ...input,
    };

    await document.set(withoutUndefined(evento));

    return evento;
  }

  private fromDocument(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): OrdemEvento {
    return {
      id,
      ordemServicoId: String(data.ordemServicoId ?? ""),
      tipo: String(data.tipo ?? "comentario") as OrdemEventoTipo,
      titulo: String(data.titulo ?? ""),
      descricao: data.descricao ? String(data.descricao) : undefined,
      criadoPor: data.criadoPor ? String(data.criadoPor) : undefined,
      createdAt: String(data.createdAt ?? ""),
    };
  }
}

export const createOrdemEventosRepository = (
  firestore: Firestore | null,
): OrdemEventosRepository => {
  if (firestore) {
    return new FirestoreOrdemEventosRepository(firestore);
  }

  return new MemoryOrdemEventosRepository();
};
