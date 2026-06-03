import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { aparelhosService } from "../aparelhos/aparelhos.service.js";
import { clientesService } from "../clientes/clientes.service.js";
import { movimentacoesEstoqueService } from "../movimentacoes-estoque/movimentacoes-estoque.service.js";
import { createOrdemEventosRepository } from "../ordem-eventos/ordem-eventos.repository.js";
import { produtosService } from "../produtos/produtos.service.js";
import { automacoesAtendimentoService } from "../whatsapp/automacoes.service.js";
import {
  createOrdensServicoRepository,
  isTerminalStatus,
  type OrdensServicoRepository,
} from "./ordens-servico.repository.js";
import type {
  OrdemServico,
  OrdemServicoInput,
  OrdemServicoStatus,
} from "./ordens-servico.types.js";

const eventosRepo = createOrdemEventosRepository(db);
const now = () => new Date().toISOString();

export class OrdensServicoService {
  constructor(
    private readonly repository: OrdensServicoRepository = createOrdensServicoRepository(db),
  ) {}

  async list(
    filters?: {
      search?: string;
      status?: OrdemServicoStatus | "";
      prioridade?: OrdemServico["prioridade"] | "";
      clienteId?: string;
      aparelhoId?: string;
    },
    tenantId?: string,
  ) {
    return this.repository.list(filters, tenantId);
  }

  async getById(id: string, tenantId?: string) {
    const ordem = await this.repository.findById(id, tenantId);

    if (!ordem) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }

    return ordem;
  }

  async create(input: OrdemServicoInput, tenantId?: string) {
    await this.ensureClienteAndAparelho(input, tenantId);
    const enrichedInput = await this.enrichPecasInput(input, tenantId);
    await this.ensurePositiveDeltasStock(enrichedInput, undefined, tenantId);

    const ordem = await this.repository.create(enrichedInput, tenantId);
    await this.applyPecasDeltas(ordem);
    await this.registrarEvento(
      ordem.id,
      "status",
      "OS criada",
      `Status inicial: ${ordem.status}. Prioridade: ${ordem.prioridade}.`,
      ordem.tecnicoResponsavel,
    );
    await automacoesAtendimentoService.aoCriarOrdem(ordem);

    return ordem;
  }

  async update(id: string, input: OrdemServicoInput, tenantId?: string) {
    const current = await this.getById(id, tenantId);

    if (isTerminalStatus(current.status)) {
      throw new AppError(
        "ordem_servico_locked",
        "Ordem de servico entregue, sem conserto ou cancelada nao pode ser editada.",
        httpStatus.badRequest,
      );
    }

    await this.ensureClienteAndAparelho(input, tenantId);
    const enrichedInput = await this.enrichPecasInput(input, tenantId);
    await this.ensurePositiveDeltasStock(enrichedInput, current, tenantId);

    const ordem = await this.repository.update(id, enrichedInput);

    if (!ordem) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }

    await this.applyPecasDeltas(ordem, current);
    await this.registrarEventosOperacionais(current, ordem);
    await automacoesAtendimentoService.aoAtualizarOrdem(current, ordem);

    return ordem;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }
  }

  private async ensureClienteAndAparelho(input: OrdemServicoInput, tenantId?: string) {
    const [cliente, aparelho] = await Promise.all([
      clientesService.getById(input.clienteId, tenantId),
      // aparelhoId sem guard de tenant: aparelhos não possuem tenantId no schema
      aparelhosService.getById(input.aparelhoId),
    ]);

    if (aparelho.clienteId !== cliente.id) {
      throw new AppError(
        "aparelho_cliente_mismatch",
        "Aparelho nao pertence ao cliente informado.",
        httpStatus.badRequest,
      );
    }
  }

  private async enrichPecasInput(
    input: OrdemServicoInput,
    tenantId?: string,
  ): Promise<OrdemServicoInput> {
    if (!input.pecasUsadas) {
      return input;
    }

    if (process.env.DEBUG_TENANT_LOOKUP === "true") {
      console.log(
        `[TENANT_LOOKUP] enrichPecasInput tenantId=${tenantId} pecas=${input.pecasUsadas.map((p) => p.produtoId).join(",")}`,
      );
    }

    const pecasUsadas = await Promise.all(
      input.pecasUsadas.map(async (peca) => {
        const produto = await produtosService.getById(peca.produtoId, tenantId);

        return {
          produtoId: produto.id,
          sku: produto.sku,
          nome: produto.nome,
          quantidade: peca.quantidade,
          valorUnitario: peca.valorUnitario ?? produto.precoVenda,
        };
      }),
    );

    return {
      ...input,
      pecasUsadas,
    };
  }

  private async ensurePositiveDeltasStock(
    input: OrdemServicoInput,
    current?: OrdemServico,
    tenantId?: string,
  ) {
    const deltas = this.calculatePecasDeltas(input.pecasUsadas ?? [], current);

    await Promise.all(
      deltas.map(async (delta) => {
        const produto = await produtosService.getById(delta.produtoId, tenantId);

        if (produto.estoqueAtual < delta.quantidade) {
          throw new AppError(
            "estoque_insuficiente",
            `Estoque insuficiente para ${produto.nome}.`,
            httpStatus.badRequest,
          );
        }
      }),
    );
  }

  private async applyPecasDeltas(ordem: OrdemServico, current?: OrdemServico) {
    const deltas = this.calculatePecasDeltas(ordem.pecasUsadas, current);

    for (const delta of deltas) {
      await movimentacoesEstoqueService.create({
        produtoId: delta.produtoId,
        tipo: "saida",
        quantidade: delta.quantidade,
        motivo: `Baixa automatica OS-${ordem.numero}`,
        origem: "ordem_servico",
        ordemServicoId: ordem.id,
      });
      await this.registrarEvento(
        ordem.id,
        "peca",
        "Peca adicionada",
        `${delta.quantidade} un. adicionada(s) e baixada(s) do estoque.`,
        ordem.tecnicoResponsavel,
      );
    }
  }

  private async registrarEventosOperacionais(current: OrdemServico, next: OrdemServico) {
    if (current.status !== next.status) {
      await this.registrarEvento(
        next.id,
        next.status === "entregue" ? "entrega" : "status",
        next.status === "entregue" ? "OS entregue" : "Status alterado",
        `${current.status} -> ${next.status}`,
        next.tecnicoResponsavel,
      );
    }

    if (current.prioridade !== next.prioridade) {
      await this.registrarEvento(
        next.id,
        "status",
        "Prioridade alterada",
        `${current.prioridade} -> ${next.prioridade}`,
        next.tecnicoResponsavel,
      );
    }

    if (!current.garantiaAte && next.garantiaAte) {
      await this.registrarEvento(
        next.id,
        "garantia",
        "Garantia registrada",
        `Garantia ate ${new Date(next.garantiaAte).toLocaleDateString("pt-BR")}.`,
        next.tecnicoResponsavel,
      );
    }

    if (!current.aprovadoEm && next.aprovadoEm) {
      await this.registrarEvento(
        next.id,
        "orcamento",
        "Aprovacao registrada",
        `Aprovado por ${next.aprovadoPor ?? "cliente"} via ${next.canalAprovacao ?? "canal nao informado"}.`,
        next.tecnicoResponsavel,
      );
    }
  }

  private async registrarEvento(
    ordemServicoId: string,
    tipo: "status" | "peca" | "garantia" | "entrega" | "orcamento",
    titulo: string,
    descricao?: string,
    criadoPor?: string,
  ) {
    await eventosRepo.create({
      ordemServicoId,
      tipo,
      titulo,
      descricao,
      criadoPor,
      createdAt: now(),
    });
  }

  private calculatePecasDeltas(
    nextPecas: { produtoId: string; quantidade: number }[],
    current?: OrdemServico,
  ) {
    return nextPecas
      .map((peca) => {
        const currentQuantidade =
          current?.pecasUsadas.find((currentPeca) => currentPeca.produtoId === peca.produtoId)
            ?.quantidade ?? 0;
        const quantidade = peca.quantidade - currentQuantidade;

        return {
          produtoId: peca.produtoId,
          quantidade,
        };
      })
      .filter((delta) => delta.quantidade > 0);
  }
}

export const ordensServicoService = new OrdensServicoService();
