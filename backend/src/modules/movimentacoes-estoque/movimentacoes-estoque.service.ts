import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import { produtosService, type ProdutosService } from "../produtos/produtos.service.js";
import {
  createMovimentacoesEstoqueRepository,
  type MovimentacoesEstoqueRepository,
} from "./movimentacoes-estoque.repository.js";
import type {
  MovimentacaoEstoqueInput,
  MovimentacaoEstoqueTipo,
} from "./movimentacoes-estoque.types.js";

const now = () => new Date().toISOString();

export class MovimentacoesEstoqueService {
  constructor(
    private readonly repository: MovimentacoesEstoqueRepository = createMovimentacoesEstoqueRepository(
      db,
    ),
    private readonly produtos: ProdutosService = produtosService,
  ) {}

  async list(filters?: { produtoId?: string; tipo?: MovimentacaoEstoqueTipo | "" }) {
    return this.repository.list(filters);
  }

  async create(input: MovimentacaoEstoqueInput) {
    const produto = await this.produtos.getById(input.produtoId);
    const estoqueAnterior = produto.estoqueAtual;
    const estoquePosterior = this.calculateEstoquePosterior(input, estoqueAnterior);
    const quantidade =
      input.tipo === "ajuste" ? Math.abs(estoquePosterior - estoqueAnterior) : input.quantidade;

    const updatedProduto = {
      sku: produto.sku,
      nome: produto.nome,
      categoria: produto.categoria,
      estoqueAtual: estoquePosterior,
      estoqueMinimo: produto.estoqueMinimo,
      custo: produto.custo,
      precoVenda: produto.precoVenda,
      ativo: produto.ativo,
      observacoes: produto.observacoes,
    };

    await this.produtos.update(produto.id, updatedProduto);

    return this.repository.create({
      produtoId: produto.id,
      produtoNome: produto.nome,
      produtoSku: produto.sku,
      tipo: input.tipo,
      quantidade,
      estoqueAnterior,
      estoquePosterior,
      motivo: input.motivo,
      origem: input.origem ?? "manual",
      ordemServicoId: input.ordemServicoId,
      criadoPor: input.criadoPor,
      tenantId: DEFAULT_TENANT_ID,
      createdAt: now(),
    });
  }

  private calculateEstoquePosterior(
    input: MovimentacaoEstoqueInput,
    estoqueAnterior: number,
  ): number {
    switch (input.tipo) {
      case "ajuste":
        return input.estoqueFinal;
      case "entrada":
        return estoqueAnterior + input.quantidade;
      case "saida": {
        const estoquePosterior = estoqueAnterior - input.quantidade;

        if (estoquePosterior < 0) {
          throw new AppError(
            "estoque_insuficiente",
            "Estoque insuficiente para registrar a saida.",
            httpStatus.badRequest,
          );
        }

        return estoquePosterior;
      }
    }
  }
}

export const movimentacoesEstoqueService = new MovimentacoesEstoqueService();
