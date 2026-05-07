import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const origemSchema = z.enum(["manual", "ordem_servico", "venda"]).optional();

const baseSchema = {
  produtoId: z.string().trim().min(1, "Produto e obrigatorio."),
  motivo: optionalText,
  origem: origemSchema,
  ordemServicoId: optionalText,
  criadoPor: optionalText,
};

export const movimentacaoEstoqueInputSchema = z.discriminatedUnion("tipo", [
  z.object({
    ...baseSchema,
    tipo: z.literal("entrada"),
    quantidade: z.coerce
      .number()
      .int("Quantidade deve ser um numero inteiro.")
      .positive("Quantidade deve ser maior que zero."),
  }),
  z.object({
    ...baseSchema,
    tipo: z.literal("saida"),
    quantidade: z.coerce
      .number()
      .int("Quantidade deve ser um numero inteiro.")
      .positive("Quantidade deve ser maior que zero."),
  }),
  z.object({
    ...baseSchema,
    tipo: z.literal("ajuste"),
    estoqueFinal: z.coerce
      .number()
      .int("Estoque final deve ser um numero inteiro.")
      .min(0, "Estoque final nao pode ser negativo."),
  }),
]);

export const movimentacaoEstoqueSearchSchema = z.object({
  produtoId: z.string().trim().optional().default(""),
  tipo: z
    .enum(["entrada", "saida", "ajuste"])
    .optional()
    .or(z.literal(""))
    .default(""),
});
