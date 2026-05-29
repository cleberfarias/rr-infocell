import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import type {
  OrdemServico,
  OrdemServicoInput,
  OrdemServicoPeca,
  OrdemServicoStatus,
} from "./ordens-servico.types.js";

const now = () => new Date().toISOString();
const ordensServicoCollection = "ordensServico";
const countersCollection = "counters";
const counterDocument = "ordensServico";
const terminalStatuses: OrdemServicoStatus[] = ["entregue", "sem_conserto", "cancelado"];
const withoutUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

const buildOrdem = (
  input: OrdemServicoInput,
  numero: number,
  current?: OrdemServico,
): OrdemServico => {
  const timestamp = now();
  const status = input.status ?? current?.status ?? "recebido";
  const prioridade = input.prioridade ?? current?.prioridade ?? "normal";
  const pecasUsadas = input.pecasUsadas
    ? input.pecasUsadas.map((peca) => ({
        produtoId: peca.produtoId,
        sku:
          peca.sku ??
          current?.pecasUsadas.find((currentPeca) => currentPeca.produtoId === peca.produtoId)
            ?.sku ??
          "",
        nome:
          peca.nome ??
          current?.pecasUsadas.find((currentPeca) => currentPeca.produtoId === peca.produtoId)
            ?.nome ??
          "",
        quantidade: peca.quantidade,
        valorUnitario: peca.valorUnitario ?? 0,
        valorTotal: peca.quantidade * (peca.valorUnitario ?? 0),
      }))
    : (current?.pecasUsadas ?? []);
  const valorPecas =
    input.pecasUsadas !== undefined
      ? pecasUsadas.reduce((total, peca) => total + peca.valorTotal, 0)
      : (input.valorPecas ?? current?.valorPecas ?? 0);
  const valorMaoObra = input.valorMaoObra ?? current?.valorMaoObra ?? 0;
  const maoObraInclusaNaPeca = input.maoObraInclusaNaPeca ?? current?.maoObraInclusaNaPeca;
  const desconto = input.desconto ?? current?.desconto ?? 0;
  const valorTotal = Math.max(0, valorPecas + valorMaoObra - desconto);
  const valorRecebido = input.valorRecebido ?? current?.valorRecebido;
  const troco =
    valorRecebido !== undefined ? Math.max(0, valorRecebido - valorTotal) : current?.troco;
  const statusChanged = current ? current.status !== status : false;
  const deliveredNow = status === "entregue" && (statusChanged || !current?.entregueEm);
  const garantiaDias = input.garantiaDias ?? current?.garantiaDias;
  const garantiaBase = deliveredNow ? timestamp : current?.entregueEm;
  const garantiaAte =
    garantiaDias && garantiaBase
      ? new Date(
          new Date(garantiaBase).getTime() + garantiaDias * 24 * 60 * 60 * 1000,
        ).toISOString()
      : current?.garantiaAte;

  return {
    id: current?.id ?? randomUUID(),
    numero,
    clienteId: input.clienteId,
    aparelhoId: input.aparelhoId,
    checklistId: input.checklistId,
    defeitoRelatado: input.defeitoRelatado,
    diagnostico: input.diagnostico,
    tipoSenha: input.tipoSenha ?? current?.tipoSenha,
    senhaAparelho:
      (input.tipoSenha ?? current?.tipoSenha) === "numerica"
        ? (input.senhaAparelho ?? current?.senhaAparelho)
        : undefined,
    padraoDeSenha:
      (input.tipoSenha ?? current?.tipoSenha) === "padrao"
        ? (input.padraoDeSenha ?? current?.padraoDeSenha)
        : undefined,
    status,
    prioridade,
    tecnicoResponsavel: input.tecnicoResponsavel,
    pecasUsadas,
    valorPecas,
    valorMaoObra,
    maoObraInclusaNaPeca,
    desconto: desconto > 0 ? desconto : undefined,
    valorTotal,
    entradaEm: input.entradaEm ?? current?.entradaEm ?? timestamp,
    previsaoEntregaEm: input.previsaoEntregaEm,
    prazoPrometidoEm:
      input.prazoPrometidoEm ?? input.previsaoEntregaEm ?? current?.prazoPrometidoEm,
    garantiaDias,
    garantiaAte,
    garantiaObservacoes: input.garantiaObservacoes ?? current?.garantiaObservacoes,
    aprovadoPor: input.aprovadoPor ?? current?.aprovadoPor,
    aprovadoEm: input.aprovadoEm ?? current?.aprovadoEm,
    canalAprovacao: input.canalAprovacao ?? current?.canalAprovacao,
    mensagemAprovacao: input.mensagemAprovacao ?? current?.mensagemAprovacao,
    concluidaEm:
      status === "pronto_para_retirada" && (statusChanged || !current?.concluidaEm)
        ? timestamp
        : current?.concluidaEm,
    entregueEm: deliveredNow ? timestamp : current?.entregueEm,
    valorAdiantado: input.valorAdiantado ?? current?.valorAdiantado,
    formaPagamentoAdiantamento:
      input.formaPagamentoAdiantamento ?? current?.formaPagamentoAdiantamento,
    formaPagamento: input.formaPagamento ?? current?.formaPagamento,
    valorRecebido,
    troco,
    pagoEm:
      status === "entregue" && (input.formaPagamento || current?.formaPagamento)
        ? (current?.pagoEm ?? timestamp)
        : current?.pagoEm,
    automacoes: current?.automacoes,
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
      prioridade: "normal",
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
      prioridade: "normal",
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
    prioridade?: OrdemServico["prioridade"] | "";
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
    prioridade?: OrdemServico["prioridade"] | "";
    clienteId?: string;
    aparelhoId?: string;
  } = {},
) => {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";

  return ordens.filter((ordem) => {
    const matchesStatus = !filters.status || ordem.status === filters.status;
    const matchesPrioridade = !filters.prioridade || ordem.prioridade === filters.prioridade;
    const matchesCliente = !filters.clienteId || ordem.clienteId === filters.clienteId;
    const matchesAparelho = !filters.aparelhoId || ordem.aparelhoId === filters.aparelhoId;
    const matchesSearch =
      !normalizedSearch ||
      [
        String(ordem.numero),
        `os-${ordem.numero}`,
        `os ${ordem.numero}`,
        `os${ordem.numero}`,
        ordem.defeitoRelatado,
        ordem.diagnostico,
        ordem.tecnicoResponsavel,
        ordem.prioridade,
        ordem.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));

    return matchesStatus && matchesPrioridade && matchesCliente && matchesAparelho && matchesSearch;
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
      prioridade?: OrdemServico["prioridade"] | "";
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
      prioridade?: OrdemServico["prioridade"] | "";
      clienteId?: string;
      aparelhoId?: string;
    } = {},
  ) {
    let query: FirebaseFirestore.Query = this.firestore.collection(ordensServicoCollection);

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters.prioridade) {
      query = query.where("prioridade", "==", filters.prioridade);
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
    const desconto = Number(data.desconto ?? 0);

    return {
      id,
      numero: Number(data.numero ?? 0),
      clienteId: String(data.clienteId ?? ""),
      aparelhoId: String(data.aparelhoId ?? ""),
      checklistId: data.checklistId ? String(data.checklistId) : undefined,
      defeitoRelatado: String(data.defeitoRelatado ?? ""),
      diagnostico: data.diagnostico ? String(data.diagnostico) : undefined,
      tipoSenha: data.tipoSenha ? (String(data.tipoSenha) as OrdemServico["tipoSenha"]) : undefined,
      senhaAparelho: data.senhaAparelho ? String(data.senhaAparelho) : undefined,
      padraoDeSenha: data.padraoDeSenha ? String(data.padraoDeSenha) : undefined,
      status: String(data.status ?? "recebido") as OrdemServicoStatus,
      prioridade: String(data.prioridade ?? "normal") as OrdemServico["prioridade"],
      tecnicoResponsavel: data.tecnicoResponsavel ? String(data.tecnicoResponsavel) : undefined,
      pecasUsadas: this.fromPecasUsadas(data.pecasUsadas),
      valorPecas,
      valorMaoObra,
      maoObraInclusaNaPeca:
        data.maoObraInclusaNaPeca !== undefined ? Boolean(data.maoObraInclusaNaPeca) : undefined,
      desconto: desconto > 0 ? desconto : undefined,
      valorTotal: Number(data.valorTotal ?? Math.max(0, valorPecas + valorMaoObra - desconto)),
      entradaEm: String(data.entradaEm ?? ""),
      previsaoEntregaEm: data.previsaoEntregaEm ? String(data.previsaoEntregaEm) : undefined,
      prazoPrometidoEm: data.prazoPrometidoEm ? String(data.prazoPrometidoEm) : undefined,
      garantiaDias: data.garantiaDias !== undefined ? Number(data.garantiaDias) : undefined,
      garantiaAte: data.garantiaAte ? String(data.garantiaAte) : undefined,
      garantiaObservacoes: data.garantiaObservacoes ? String(data.garantiaObservacoes) : undefined,
      aprovadoPor: data.aprovadoPor ? String(data.aprovadoPor) : undefined,
      aprovadoEm: data.aprovadoEm ? String(data.aprovadoEm) : undefined,
      canalAprovacao: data.canalAprovacao
        ? (String(data.canalAprovacao) as OrdemServico["canalAprovacao"])
        : undefined,
      mensagemAprovacao: data.mensagemAprovacao ? String(data.mensagemAprovacao) : undefined,
      concluidaEm: data.concluidaEm ? String(data.concluidaEm) : undefined,
      entregueEm: data.entregueEm ? String(data.entregueEm) : undefined,
      valorAdiantado: data.valorAdiantado !== undefined ? Number(data.valorAdiantado) : undefined,
      formaPagamentoAdiantamento: data.formaPagamentoAdiantamento
        ? (String(data.formaPagamentoAdiantamento) as OrdemServico["formaPagamentoAdiantamento"])
        : undefined,
      formaPagamento: data.formaPagamento
        ? (String(data.formaPagamento) as OrdemServico["formaPagamento"])
        : undefined,
      valorRecebido: data.valorRecebido !== undefined ? Number(data.valorRecebido) : undefined,
      troco: data.troco !== undefined ? Number(data.troco) : undefined,
      pagoEm: data.pagoEm ? String(data.pagoEm) : undefined,
      automacoes:
        data.automacoes && typeof data.automacoes === "object"
          ? (data.automacoes as OrdemServico["automacoes"])
          : undefined,
      createdAt: String(data.createdAt ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
    };
  }

  private fromPecasUsadas(value: unknown): OrdemServicoPeca[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((peca) => ({
      produtoId: String(peca?.produtoId ?? ""),
      sku: String(peca?.sku ?? ""),
      nome: String(peca?.nome ?? ""),
      quantidade: Number(peca?.quantidade ?? 0),
      valorUnitario: Number(peca?.valorUnitario ?? 0),
      valorTotal: Number(peca?.valorTotal ?? 0),
    }));
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
