import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { aparelhosService } from "../aparelhos/aparelhos.service.js";
import { clientesService } from "../clientes/clientes.service.js";
import { movimentacoesEstoqueService } from "../movimentacoes-estoque/movimentacoes-estoque.service.js";
import { produtosService } from "../produtos/produtos.service.js";
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

export class OrdensServicoService {
  constructor(
    private readonly repository: OrdensServicoRepository = createOrdensServicoRepository(db),
  ) {}

  async list(filters?: {
    search?: string;
    status?: OrdemServicoStatus | "";
    clienteId?: string;
    aparelhoId?: string;
  }) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const ordem = await this.repository.findById(id);

    if (!ordem) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }

    return ordem;
  }

  async create(input: OrdemServicoInput) {
    await this.ensureClienteAndAparelho(input);
    const enrichedInput = await this.enrichPecasInput(input);
    await this.ensurePositiveDeltasStock(enrichedInput);

    const ordem = await this.repository.create(enrichedInput);
    await this.applyPecasDeltas(ordem);

    return ordem;
  }

  async update(id: string, input: OrdemServicoInput) {
    const current = await this.getById(id);

    if (isTerminalStatus(current.status)) {
      throw new AppError(
        "ordem_servico_locked",
        "Ordem de servico entregue ou cancelada nao pode ser editada.",
        httpStatus.badRequest,
      );
    }

    await this.ensureClienteAndAparelho(input);
    const enrichedInput = await this.enrichPecasInput(input);
    await this.ensurePositiveDeltasStock(enrichedInput, current);

    const ordem = await this.repository.update(id, enrichedInput);

    if (!ordem) {
      throw new AppError(
        "ordem_servico_not_found",
        "Ordem de servico nao encontrada.",
        httpStatus.notFound,
      );
    }

    await this.applyPecasDeltas(ordem, current);

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

  private async ensureClienteAndAparelho(input: OrdemServicoInput) {
    const [cliente, aparelho] = await Promise.all([
      clientesService.getById(input.clienteId),
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

  private async enrichPecasInput(input: OrdemServicoInput): Promise<OrdemServicoInput> {
    if (!input.pecasUsadas) {
      return input;
    }

    const pecasUsadas = await Promise.all(
      input.pecasUsadas.map(async (peca) => {
        const produto = await produtosService.getById(peca.produtoId);

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
  ) {
    const deltas = this.calculatePecasDeltas(input.pecasUsadas ?? [], current);

    await Promise.all(
      deltas.map(async (delta) => {
        const produto = await produtosService.getById(delta.produtoId);

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
    }
  }

  private calculatePecasDeltas(
    nextPecas: { produtoId: string; quantidade: number }[],
    current?: OrdemServico,
  ) {
    return nextPecas
      .map((peca) => {
        const currentQuantidade =
          current?.pecasUsadas.find(
            (currentPeca) => currentPeca.produtoId === peca.produtoId,
          )?.quantidade ?? 0;
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
