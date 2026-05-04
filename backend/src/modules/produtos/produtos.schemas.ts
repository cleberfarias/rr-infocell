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

export const produtoInputSchema = z.object({
  sku: z.string().trim().min(2, "SKU deve ter pelo menos 2 caracteres."),
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  categoria: z.enum(["peca", "produto", "acessorio", "servico"]),
  estoqueAtual: stock,
  estoqueMinimo: stock,
  custo: money,
  precoVenda: money,
  ativo: z.boolean().optional(),
  observacoes: optionalText,
});

export const produtoSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  categoria: z
    .enum(["peca", "produto", "acessorio", "servico"])
    .optional()
    .or(z.literal(""))
    .default(""),
  ativo: z.enum(["true", "false"]).optional().or(z.literal("")).default(""),
});
