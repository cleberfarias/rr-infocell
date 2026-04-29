import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import type {
  OrdemServico,
  OrdemServicoInput,
  OrdemServicoStatus,
} from "./ordens-servico.types.js";

const now = () => new Date().toISOString();
const ordensServicoCollection = "ordensServico";
const countersCollection = "counters";
const counterDocument = "ordensServico";
const terminalStatuses: OrdemServicoStatus[] = ["entregue", "cancelado"];
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

const buildOrdem = (
  input: OrdemServicoInput,
  numero: number,
  current?: OrdemServico,
): OrdemServico => {
  const timestamp = now();
  const status = input.status ?? current?.status ?? "recebido";
  const valorPecas = input.valorPecas ?? current?.valorPecas ?? 0;
  const valorMaoObra = input.valorMaoObra ?? current?.valorMaoObra ?? 0;
  const statusChanged = current ? current.status !== status : false;

  return {
    id: current?.id ?? randomUUID(),
    numero,
    clienteId: input.clienteId,
    aparelhoId: input.aparelhoId,
    checklistId: input.checklistId,
    defeitoRelatado: input.defeitoRelatado,
    diagnostico: input.diagnostico,
    status,
    tecnicoResponsavel: input.tecnicoResponsavel,
    valorPecas,
    valorMaoObra,
    valorTotal: valorPecas + valorMaoObra,
    entradaEm: input.entradaEm ?? current?.entradaEm ?? timestamp,
    previsaoEntregaEm: input.previsaoEntregaEm,
    concluidaEm:
      status === "pronto_para_retirada" && (statusChanged || !current?.concluidaEm)
        ? timestamp
        : current?.concluidaEm,
    entregueEm:
      status === "entregue" && (statusChanged || !current?.entregueEm)
        ? timestamp
        : current?.entregueEm,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};

const seedOrdensServico: OrdemServico[] = [
  buildOrdem(
    {
      clienteId: "cli_marcos_almeida",
      aparelhoId: "apa_iphone_11_marcos",
      defeitoRelatado: "Aparelho nao carrega",
      status: "recebido",
      tecnicoResponsavel: "Rafael S.",
      valorPecas: 0,
      valorMaoObra: 0,
    },
    1,
  ),
  buildOrdem(
    {
      clienteId: "cli_juliana_ramos",
      aparelhoId: "apa_moto_g_juliana",
      defeitoRelatado: "Tela quebrada",
      status: "em_analise",
      tecnicoResponsavel: "Diego M.",
      valorPecas: 180,
      valorMaoObra: 80,
    },
    2,
  ),
];

export interface OrdensServicoRepository {
  list(filters?: {
    search?: string;
    status?: OrdemServicoStatus | "";
    clienteId?: string;
    aparelhoId?: string;
  }): Promise<OrdemServico[]>;
  findById(id: string): Promise<OrdemServico | null>;
  create(input: OrdemServicoInput): Promise<OrdemServico>;
  update(id: string, input: OrdemServicoInput): Promise<OrdemServico | null>;
  delete(id: string): Promise<boolean>;
}

const filterOrdensServico = (
  ordens: OrdemServico[],
  filters: {
    search?: string;
    status?: OrdemServicoStatus | "";
    clienteId?: string;
    aparelhoId?: string;
  } = {},
) => {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";

  return ordens.filter((ordem) => {
    const matchesStatus = !filters.status || ordem.status === filters.status;
    const matchesCliente = !filters.clienteId || ordem.clienteId === filters.clienteId;
    const matchesAparelho = !filters.aparelhoId || ordem.aparelhoId === filters.aparelhoId;
    const matchesSearch =
      !normalizedSearch ||
      [
        String(ordem.numero),
        ordem.defeitoRelatado,
        ordem.diagnostico,
        ordem.tecnicoResponsavel,
        ordem.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));

    return matchesStatus && matchesCliente && matchesAparelho && matchesSearch;
  });
};

export class MemoryOrdensServicoRepository implements OrdensServicoRepository {
  private readonly ordens = new Map<string, OrdemServico>(
    seedOrdensServico.map((ordem) => [ordem.id, ordem]),
  );

  private nextNumero = Math.max(...seedOrdensServico.map((ordem) => ordem.numero)) + 1;

  async list(
    filters: {
      search?: string;
      status?: OrdemServicoStatus | "";
      clienteId?: string;
      aparelhoId?: string;
    } = {},
  ) {
    const ordens = Array.from(this.ordens.values()).sort((a, b) => b.numero - a.numero);

    return filterOrdensServico(ordens, filters);
  }

  async findById(id: string) {
    return this.ordens.get(id) ?? null;
  }

  async create(input: OrdemServicoInput) {
    const ordem = buildOrdem(input, this.nextNumero);
    this.nextNumero += 1;

    this.ordens.set(ordem.id, ordem);

    return ordem;
  }

  async update(id: string, input: OrdemServicoInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const ordem = buildOrdem(input, current.numero, current);
    this.ordens.set(id, ordem);

    return ordem;
  }

  async delete(id: string) {
    return this.ordens.delete(id);
  }
}

export class FirestoreOrdensServicoRepository implements OrdensServicoRepository {
  constructor(private readonly firestore: Firestore) {}

  async list(
    filters: {
      search?: string;
      status?: OrdemServicoStatus | "";
      clienteId?: string;
      aparelhoId?: string;
    } = {},
  ) {
    let query: FirebaseFirestore.Query = this.firestore.collection(ordensServicoCollection);

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters.clienteId) {
      query = query.where("clienteId", "==", filters.clienteId);
    }

    if (filters.aparelhoId) {
      query = query.where("aparelhoId", "==", filters.aparelhoId);
    }

    const snapshot = await query.get();
    const ordens = snapshot.docs
      .map((document) => this.fromDocument(document.id, document.data()))
      .sort((a, b) => b.numero - a.numero);

    return filterOrdensServico(ordens, filters);
  }

  async findById(id: string) {
    const document = await this.firestore.collection(ordensServicoCollection).doc(id).get();

    if (!document.exists) {
      return null;
    }

    return this.fromDocument(document.id, document.data() ?? {});
  }

  async create(input: OrdemServicoInput) {
    return this.firestore.runTransaction(async (transaction) => {
      const counterRef = this.firestore.collection(countersCollection).doc(counterDocument);
      const counter = await transaction.get(counterRef);
      const current = Number(counter.data()?.nextNumero ?? 1);
      const ordemRef = this.firestore.collection(ordensServicoCollection).doc();
      const ordem = buildOrdem(input, current);

      transaction.set(ordemRef, withoutUndefined({ ...ordem, id: ordemRef.id }));
      transaction.set(counterRef, { nextNumero: current + 1 }, { merge: true });

      return { ...ordem, id: ordemRef.id };
    });
  }

  async update(id: string, input: OrdemServicoInput) {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const ordem = buildOrdem(input, current.numero, current);

    await this.firestore.collection(ordensServicoCollection).doc(id).set(withoutUndefined(ordem));

    return ordem;
  }

  async delete(id: string) {
    const current = await this.findById(id);

    if (!current) {
      return false;
    }

    await this.firestore.collection(ordensServicoCollection).doc(id).delete();

    return true;
  }

  private fromDocument(id: string, data: FirebaseFirestore.DocumentData): OrdemServico {
    const valorPecas = Number(data.valorPecas ?? 0);
    const valorMaoObra = Number(data.valorMaoObra ?? 0);

    return {
      id,
      numero: Number(data.numero ?? 0),
      clienteId: String(data.clienteId ?? ""),
      aparelhoId: String(data.aparelhoId ?? ""),
      checklistId: data.checklistId ? String(data.checklistId) : undefined,
      defeitoRelatado: String(data.defeitoRelatado ?? ""),
      diagnostico: data.diagnostico ? String(data.diagnostico) : undefined,
      status: String(data.status ?? "recebido") as OrdemServicoStatus,
      tecnicoResponsavel: data.tecnicoResponsavel ? String(data.tecnicoResponsavel) : undefined,
      valorPecas,
      valorMaoObra,
      valorTotal: Number(data.valorTotal ?? valorPecas + valorMaoObra),
      entradaEm: String(data.entradaEm ?? ""),
      previsaoEntregaEm: data.previsaoEntregaEm ? String(data.previsaoEntregaEm) : undefined,
      concluidaEm: data.concluidaEm ? String(data.concluidaEm) : undefined,
      entregueEm: data.entregueEm ? String(data.entregueEm) : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }
}

export const createOrdensServicoRepository = (
  firestore: Firestore | null,
): OrdensServicoRepository => {
  if (firestore) {
    return new FirestoreOrdensServicoRepository(firestore);
  }

  return new MemoryOrdensServicoRepository();
};

export const isTerminalStatus = (status: OrdemServicoStatus) => terminalStatuses.includes(status);
