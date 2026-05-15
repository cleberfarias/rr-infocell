import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const money = z.coerce.number().min(0, "Valor nao pode ser negativo.");
const stock = z.coerce
  .number()
  .int("Estoque deve ser um numero inteiro.")
  .min(0, "Estoque nao pode ser negativo.");

export const produtoInputSchema = z
  .object({
    sku: z.string().trim().min(2, "SKU deve ter pelo menos 2 caracteres."),
    nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
    categoria: z.enum([
      "peca",
      "produto",
      "acessorio",
      "servico",
      "celular_novo",
      "celular_seminovo",
      "celular_restaurado",
    ]),
    estoqueAtual: stock,
    estoqueMinimo: stock,
    custo: money,
    precoVenda: money,
    ativo: z.boolean().optional(),
    marca: optionalText,
    modelo: optionalText,
    imei: optionalText,
    cor: optionalText,
    capacidade: optionalText,
    estadoConservacao: optionalText,
    saudeBateria: z.coerce.number().min(0).max(100).optional(),
    origem: z.enum(["compra", "troca", "consignado"]).optional(),
    garantiaDias: z.coerce.number().int().min(0).max(3650).optional(),
    laudoEntrada: optionalText,
    custoRestauracao: money.optional(),
    observacoes: optionalText,
  })
  .superRefine((input, ctx) => {
    const isCelular = input.categoria.startsWith("celular_");

    if (isCelular && !input.imei) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IMEI e obrigatorio para celular.",
        path: ["imei"],
      });
    }

    if (isCelular && input.estoqueAtual > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Celular deve ter estoque individual por IMEI.",
        path: ["estoqueAtual"],
      });
    }
  });

export const produtoSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  categoria: z
    .enum([
      "peca",
      "produto",
      "acessorio",
      "servico",
      "celular_novo",
      "celular_seminovo",
      "celular_restaurado",
    ])
    .optional()
    .or(z.literal(""))
    .default(""),
  ativo: z.enum(["true", "false"]).optional().or(z.literal("")).default(""),
});
