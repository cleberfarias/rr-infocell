import { z } from "zod";

import { ordemServicoStatus } from "./ordens-servico.types.js";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalDateText = optionalText.refine(
  (value) => !value || !Number.isNaN(Date.parse(value)),
  "Data invalida.",
);

const money = z.coerce.number().min(0, "Valor nao pode ser negativo.").optional();
const pecaSchema = z.object({
  produtoId: z.string().trim().min(1, "Produto da peca e obrigatorio."),
  quantidade: z.coerce
    .number()
    .int("Quantidade da peca deve ser um numero inteiro.")
    .positive("Quantidade da peca deve ser maior que zero."),
  valorUnitario: money,
});

export const ordemServicoInputSchema = z.object({
  clienteId: z.string().trim().min(1, "Cliente e obrigatorio."),
  aparelhoId: z.string().trim().min(1, "Aparelho e obrigatorio."),
  checklistId: optionalText,
  defeitoRelatado: z.string().trim().min(3, "Defeito relatado deve ter pelo menos 3 caracteres."),
  diagnostico: optionalText,
  tipoSenha: z.enum(["sem_senha", "numerica", "padrao", "nao_informou"]).optional(),
  senhaAparelho: optionalText,
  padraoDeSenha: optionalText,
  status: z.enum(ordemServicoStatus).optional(),
  prioridade: z.enum(["baixa", "normal", "urgente"]).optional(),
  tecnicoResponsavel: optionalText,
  pecasUsadas: z.array(pecaSchema).optional(),
  valorPecas: money,
  valorMaoObra: money,
  desconto: money,
  entradaEm: optionalDateText,
  previsaoEntregaEm: optionalDateText,
  prazoPrometidoEm: optionalDateText,
  garantiaDias: z.coerce.number().int().min(0).max(3650).optional(),
  garantiaObservacoes: optionalText,
  aprovadoPor: optionalText,
  aprovadoEm: optionalDateText,
  canalAprovacao: z.enum(["balcao", "whatsapp", "telefone"]).optional(),
  mensagemAprovacao: optionalText,
  formaPagamento: z.enum(["pix", "cartao", "dinheiro"]).optional(),
  valorRecebido: money,
});

export const ordemServicoSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(ordemServicoStatus).optional().or(z.literal("")).default(""),
  prioridade: z.enum(["baixa", "normal", "urgente"]).optional().or(z.literal("")).default(""),
  clienteId: z.string().trim().optional().default(""),
  aparelhoId: z.string().trim().optional().default(""),
});
