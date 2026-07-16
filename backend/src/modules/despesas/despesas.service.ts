import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { createDespesasRepository, type DespesasRepository } from "./despesas.repository.js";
import type { DespesaCategoria, DespesaInput } from "./despesas.types.js";

export class DespesasService {
  constructor(private readonly repository: DespesasRepository = createDespesasRepository(db)) {}

  async list(
    filters?: {
      search?: string;
      categoria?: DespesaCategoria | "";
      pago?: boolean | "";
      competencia?: string;
    },
    tenantId?: string,
  ) {
    if (filters?.competencia) {
      await this.materializarFixas(filters.competencia, tenantId);
    }
    return this.repository.list(filters, tenantId);
  }

  async getById(id: string, tenantId?: string) {
    const despesa = await this.repository.findById(id, tenantId);

    if (!despesa) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }

    return despesa;
  }

  async create(input: DespesaInput, tenantId?: string) {
    const tipoLancamento = input.tipoLancamento ?? (input.recorrente ? "fixa" : "unica");
    const origem = await this.repository.create(
      { ...input, tipoLancamento, recorrente: tipoLancamento !== "unica" },
      tenantId,
    );

    if (tipoLancamento === "parcelada" && input.totalParcelas) {
      await this.criarFilhas(origem, input.totalParcelas - 1, tenantId);
    }

    return origem;
  }

  private async materializarFixas(competencia: string, tenantId?: string) {
    const [ano, mes] = competencia.split("-").map(Number);
    const existentes = await this.repository.list(undefined, tenantId);
    const origens = existentes.filter(
      (despesa) => despesa.tipoLancamento === "fixa" && !despesa.recorrenciaOrigemId,
    );

    for (const origem of origens) {
      const base = parseVencimento(origem.vencimento);
      if (!base) continue;
      const indice = (ano - base.ano) * 12 + (mes - base.mes);
      if (indice <= 0) continue;
      const jaExiste = existentes.some(
        (despesa) =>
          despesa.recorrenciaOrigemId === origem.id && despesa.recorrenciaIndice === indice,
      );
      if (!jaExiste) await this.criarFilhas(origem, 1, tenantId, indice);
    }
  }

  private async criarFilhas(
    origem: Awaited<ReturnType<DespesasRepository["create"]>>,
    quantidade: number,
    tenantId?: string,
    inicio = 1,
  ) {
    const base = parseVencimento(origem.vencimento);
    if (!base) return [];
    const criadas = [];
    for (let indice = inicio; indice < inicio + quantidade; indice += 1) {
      criadas.push(await this.repository.create({
        descricao: origem.descricao,
        categoria: origem.categoria,
        fornecedor: origem.fornecedor,
        valor: origem.valor,
        vencimento: adicionarMeses(base, indice),
        recorrente: true,
        tipoLancamento: origem.tipoLancamento,
        totalParcelas: origem.totalParcelas,
        pago: false,
        recorrenciaOrigemId: origem.id,
        recorrenciaIndice: indice,
      }, tenantId));
    }
    return criadas;
  }

  async criarRecorrencias(id: string, meses: number, tenantId?: string) {
    const selecionada = await this.getById(id, tenantId);
    const origem = selecionada.recorrenciaOrigemId
      ? await this.getById(selecionada.recorrenciaOrigemId, tenantId)
      : selecionada;
    const vencimentoBase = parseVencimento(origem.vencimento);

    if (!vencimentoBase) {
      throw new AppError(
        "vencimento_invalido",
        "Use um vencimento no formato dd/mm, dd/mm/aaaa ou aaaa-mm-dd.",
        httpStatus.badRequest,
      );
    }

    const existentes = await this.repository.list(undefined, tenantId);
    const indicesExistentes = new Set(
      existentes
        .filter((despesa) => despesa.recorrenciaOrigemId === origem.id)
        .map((despesa) => despesa.recorrenciaIndice),
    );
    const criadas = [];

    for (let indice = 1; indice <= meses; indice += 1) {
      if (indicesExistentes.has(indice)) continue;

      criadas.push(
        await this.repository.create(
          {
            descricao: origem.descricao,
            categoria: origem.categoria,
            fornecedor: origem.fornecedor,
            valor: origem.valor,
            vencimento: adicionarMeses(vencimentoBase, indice),
            recorrente: true,
            tipoLancamento: origem.tipoLancamento,
            totalParcelas: origem.totalParcelas,
            pago: false,
            recorrenciaOrigemId: origem.id,
            recorrenciaIndice: indice,
          },
          tenantId,
        ),
      );
    }

    return { origem, criadas, ignoradas: meses - criadas.length };
  }

  async update(id: string, input: DespesaInput, tenantId?: string) {
    const despesa = await this.repository.update(id, input, tenantId);

    if (!despesa) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }

    return despesa;
  }

  async delete(id: string, tenantId?: string) {
    const deleted = await this.repository.delete(id, tenantId);

    if (!deleted) {
      throw new AppError("despesa_not_found", "Despesa nao encontrada.", httpStatus.notFound);
    }
  }
}

export const despesasService = new DespesasService();

type VencimentoBase = { dia: number; mes: number; ano: number };

const parseVencimento = (value: string): VencimentoBase | null => {
  const trimmed = value.trim();
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const dia = br ? Number(br[1]) : iso ? Number(iso[3]) : NaN;
  const mes = br ? Number(br[2]) : iso ? Number(iso[2]) : NaN;
  const anoTexto = br?.[3];
  const ano = iso
    ? Number(iso[1])
    : anoTexto
      ? Number(anoTexto.length === 2 ? `20${anoTexto}` : anoTexto)
      : new Date().getFullYear();

  if (!Number.isInteger(dia) || !Number.isInteger(mes) || dia < 1 || mes < 1 || mes > 12) {
    return null;
  }

  const ultimoDia = new Date(ano, mes, 0).getDate();
  return dia <= ultimoDia ? { dia, mes, ano } : null;
};

const adicionarMeses = (base: VencimentoBase, offset: number) => {
  const primeiroDia = new Date(base.ano, base.mes - 1 + offset, 1);
  const ano = primeiroDia.getFullYear();
  const mes = primeiroDia.getMonth() + 1;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(base.dia, ultimoDia);

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
};
