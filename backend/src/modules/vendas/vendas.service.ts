import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import { httpStatus } from "../../shared/http-status.js";
import { ordemEventosService } from "../ordem-eventos/ordem-eventos.service.js";
import { ordensServicoService } from "../ordens-servico/ordens-servico.service.js";
import type { OrdemServico } from "../ordens-servico/ordens-servico.types.js";
import { movimentacoesEstoqueService } from "../movimentacoes-estoque/movimentacoes-estoque.service.js";
import { produtosService } from "../produtos/produtos.service.js";
import { createVendasRepository, type VendasRepository } from "./vendas.repository.js";
import type { VendaInput, VendaStatus } from "./vendas.types.js";

const now = () => new Date().toISOString();

export class VendasService {
  constructor(private readonly repository: VendasRepository = createVendasRepository(db)) {}

  async list(filters?: { ordemServicoId?: string; status?: VendaStatus | "" }, tenantId?: string) {
    return this.repository.list(filters, tenantId);
  }

  async create(input: VendaInput, tenantId = DEFAULT_TENANT_ID) {
    if (!input.ordemServicoId) {
      return this.createVendaDireta(input, tenantId);
    }

    const ordem = await ordensServicoService.getById(input.ordemServicoId, tenantId);

    if (ordem.status !== "pronto_para_retirada") {
      throw new AppError(
        "ordem_servico_not_ready",
        "Somente OS pronta para retirada pode ser finalizada no PDV.",
        httpStatus.badRequest,
      );
    }

    const desconto = input.desconto && input.desconto > 0 ? input.desconto : 0;
    const totalComDesconto = Math.max(0, ordem.valorTotal - desconto);
    const valorAdiantado = ordem.valorAdiantado ?? 0;
    const saldo = Math.max(0, totalComDesconto - valorAdiantado);

    if (input.valorRecebido < saldo) {
      throw new AppError(
        "pagamento_insuficiente",
        "Valor recebido menor que o saldo devedor da OS.",
        httpStatus.badRequest,
      );
    }

    const currentVenda = await this.repository.findByOrdem(ordem.id);

    if (currentVenda) {
      throw new AppError(
        "venda_already_exists",
        "Esta OS ja possui venda finalizada.",
        httpStatus.badRequest,
      );
    }

    const descontoTotal = (ordem.desconto ?? 0) + desconto;
    const delivered = await ordensServicoService.update(ordem.id, {
      ...this.toOrdemInput(ordem),
      desconto: descontoTotal > 0 ? descontoTotal : undefined,
      status: "entregue",
      formaPagamento: input.formaPagamento,
      valorRecebido: input.valorRecebido,
    });
    const venda = await this.repository.create({
      tipo: "ordem_servico",
      ordemServicoId: delivered.id,
      numeroOs: delivered.numero,
      clienteId: delivered.clienteId,
      aparelhoId: delivered.aparelhoId,
      itens: delivered.pecasUsadas.map((peca) => ({
        produtoId: peca.produtoId,
        sku: peca.sku,
        nome: peca.nome,
        quantidade: peca.quantidade,
        valorUnitario: peca.valorUnitario,
        valorTotal: peca.valorTotal,
      })),
      valorPecas: delivered.valorPecas,
      valorMaoObra: delivered.valorMaoObra,
      desconto: desconto > 0 ? desconto : undefined,
      valorTotal: totalComDesconto,
      formaPagamento: input.formaPagamento,
      valorRecebido: input.valorRecebido,
      troco: Math.max(0, input.valorRecebido - saldo),
      status: "finalizada",
      tenantId,
      createdAt: delivered.pagoEm ?? now(),
    });

    await ordemEventosService.create({
      ordemServicoId: delivered.id,
      tipo: "venda",
      titulo: "Venda finalizada no PDV",
      descricao: `Pagamento ${input.formaPagamento} de ${input.valorRecebido.toLocaleString(
        "pt-BR",
        { currency: "BRL", style: "currency" },
      )}.`,
      criadoPor: delivered.tecnicoResponsavel,
    });

    return venda;
  }

  private async createVendaDireta(input: VendaInput, tenantId = DEFAULT_TENANT_ID) {
    if (process.env.DEBUG_TENANT_LOOKUP === "true") {
      console.log(
        `[TENANT_LOOKUP] createVendaDireta tenantId=${tenantId} itens=${(input.itens ?? []).map((i) => i.produtoId).join(",")}`,
      );
    }
    const itensInput = input.itens ?? [];
    const itens = await Promise.all(
      itensInput.map(async (item) => {
        const produto = await produtosService.getById(item.produtoId, tenantId);
        const quantidade = item.quantidade;

        if (produto.categoria !== "servico" && produto.estoqueAtual < quantidade) {
          throw new AppError(
            "estoque_insuficiente",
            `Estoque insuficiente para ${produto.nome}.`,
            httpStatus.badRequest,
          );
        }

        if (produto.categoria.startsWith("celular_") && quantidade !== 1) {
          throw new AppError(
            "celular_venda_individual",
            "Celular deve ser vendido individualmente por IMEI.",
            httpStatus.badRequest,
          );
        }

        const garantiaDias = item.garantiaDias ?? produto.garantiaDias;
        const garantiaAte = garantiaDias
          ? new Date(Date.now() + garantiaDias * 24 * 60 * 60 * 1000).toISOString()
          : undefined;
        const valorUnitario = item.valorUnitario ?? produto.precoVenda;

        return {
          produtoId: produto.id,
          sku: produto.sku,
          nome: produto.nome,
          categoria: produto.categoria,
          imei: produto.imei,
          quantidade,
          valorUnitario,
          valorTotal: quantidade * valorUnitario,
          garantiaDias,
          garantiaAte,
        };
      }),
    );

    const subtotal = itens.reduce((total, item) => total + item.valorTotal, 0);
    const desconto = input.desconto && input.desconto > 0 ? input.desconto : 0;
    const valorTotal = Math.max(0, subtotal - desconto);

    if (input.valorRecebido < valorTotal) {
      throw new AppError(
        "pagamento_insuficiente",
        "Valor recebido menor que o total da venda.",
        httpStatus.badRequest,
      );
    }

    for (const item of itens) {
      if (item.categoria === "servico") {
        continue;
      }

      await movimentacoesEstoqueService.create({
        produtoId: item.produtoId,
        tipo: "saida",
        quantidade: item.quantidade,
        motivo: `Venda direta${item.imei ? ` IMEI ${item.imei}` : ""}`,
        origem: "venda",
      }, tenantId);
    }

    return this.repository.create({
      tipo: "direta",
      clienteId: input.clienteId,
      clienteNome: input.clienteNome,
      itens,
      valorPecas: itens
        .filter((item) => item.categoria !== "servico")
        .reduce((total, item) => total + item.valorTotal, 0),
      valorMaoObra: itens
        .filter((item) => item.categoria === "servico")
        .reduce((total, item) => total + item.valorTotal, 0),
      desconto: desconto > 0 ? desconto : undefined,
      valorTotal,
      formaPagamento: input.formaPagamento,
      valorRecebido: input.valorRecebido,
      troco: Math.max(0, input.valorRecebido - valorTotal),
      status: "finalizada",
      tenantId,
      createdAt: now(),
    });
  }

  private toOrdemInput(ordem: OrdemServico) {
    return {
      clienteId: ordem.clienteId,
      aparelhoId: ordem.aparelhoId,
      checklistId: ordem.checklistId,
      defeitoRelatado: ordem.defeitoRelatado,
      diagnostico: ordem.diagnostico,
      tipoSenha: ordem.tipoSenha,
      senhaAparelho: ordem.senhaAparelho,
      padraoDeSenha: ordem.padraoDeSenha,
      tecnicoResponsavel: ordem.tecnicoResponsavel,
      pecasUsadas:
        ordem.pecasUsadas.length > 0
          ? ordem.pecasUsadas.map((peca) => ({
              produtoId: peca.produtoId,
              quantidade: peca.quantidade,
              valorUnitario: peca.valorUnitario,
            }))
          : undefined,
      valorPecas: ordem.valorPecas,
      valorMaoObra: ordem.valorMaoObra,
      maoObraInclusaNaPeca: ordem.maoObraInclusaNaPeca,
      desconto: ordem.desconto,
      valorAdiantado: ordem.valorAdiantado,
      formaPagamentoAdiantamento: ordem.formaPagamentoAdiantamento,
      entradaEm: ordem.entradaEm,
      previsaoEntregaEm: ordem.previsaoEntregaEm,
    };
  }
}

export const vendasService = new VendasService();
