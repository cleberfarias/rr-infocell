import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import {
  createProdutosRepository,
  type ProdutosRepository,
} from "./produtos.repository.js";
import type { ProdutoCategoria, ProdutoInput } from "./produtos.types.js";

export class ProdutosService {
  constructor(
    private readonly repository: ProdutosRepository = createProdutosRepository(db),
  ) {}

  async list(filters?: {
    search?: string;
    categoria?: ProdutoCategoria | "";
    ativo?: boolean | "";
  }) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const produto = await this.repository.findById(id);

    if (!produto) {
      throw new AppError("produto_not_found", "Produto nao encontrado.", httpStatus.notFound);
    }

    return produto;
  }

  async create(input: ProdutoInput) {
    return this.repository.create(input);
  }

  async update(id: string, input: ProdutoInput) {
    const produto = await this.repository.update(id, input);

    if (!produto) {
      throw new AppError("produto_not_found", "Produto nao encontrado.", httpStatus.notFound);
    }

    return produto;
  }

  async delete(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AppError("produto_not_found", "Produto nao encontrado.", httpStatus.notFound);
    }
  }
}

export const produtosService = new ProdutosService();
