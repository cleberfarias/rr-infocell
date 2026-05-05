import { db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { ordemEventosService } from "../ordem-eventos/ordem-eventos.service.js";
import { ordensServicoService } from "../ordens-servico/ordens-servico.service.js";
import type { OrdemServico } from "../ordens-servico/ordens-servico.types.js";
import {
  createVendasRepository,
  type VendasRepository,
} from "./vendas.repository.js";
import type { VendaInput, VendaStatus } from "./vendas.types.js";

const now = () => new Date().toISOString();

export class VendasService {
  constructor(
    private readonly repository: VendasRepository = createVendasRepository(db),
  ) {}

  async list(filters?: {
    ordemServicoId?: string;
    status?: VendaStatus | "";
  }) {
    return this.repository.list(filters);
  }

  async create(input: VendaInput) {
    const ordem = await ordensServicoService.getById(input.ordemServicoId);

    if (ordem.status !== "pronto_para_retirada") {
      throw new AppError(
        "ordem_servico_not_ready",
        "Somente OS pronta para retirada pode ser finalizada no PDV.",
        httpStatus.badRequest,
      );
    }

    if (input.valorRecebido < ordem.valorTotal) {
      throw new AppError(
        "pagamento_insuficiente",
        "Valor recebido menor que o total da OS.",
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

    const delivered = await ordensServicoService.update(ordem.id, {
      ...this.toOrdemInput(ordem),
      status: "entregue",
      formaPagamento: input.formaPagamento,
      valorRecebido: input.valorRecebido,
    });
    const venda = await this.repository.create({
      ordemServicoId: delivered.id,
      numeroOs: delivered.numero,
      clienteId: delivered.clienteId,
      aparelhoId: delivered.aparelhoId,
      valorPecas: delivered.valorPecas,
      valorMaoObra: delivered.valorMaoObra,
      valorTotal: delivered.valorTotal,
      formaPagamento: input.formaPagamento,
      valorRecebido: input.valorRecebido,
      troco: delivered.troco ?? 0,
      status: "finalizada",
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

  private toOrdemInput(ordem: OrdemServico) {
    return {
      clienteId: ordem.clienteId,
      aparelhoId: ordem.aparelhoId,
      checklistId: ordem.checklistId,
      defeitoRelatado: ordem.defeitoRelatado,
      diagnostico: ordem.diagnostico,
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
      entradaEm: ordem.entradaEm,
      previsaoEntregaEm: ordem.previsaoEntregaEm,
    };
  }
}

export const vendasService = new VendasService();
