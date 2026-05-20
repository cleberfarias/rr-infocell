import { z } from "zod";

export const vendaInputSchema = z
  .object({
    ordemServicoId: z.string().trim().optional(),
    clienteId: z.string().trim().optional(),
    clienteNome: z.string().trim().optional(),
    itens: z
      .array(
        z.object({
          produtoId: z.string().trim().min(1, "Produto e obrigatorio."),
          quantidade: z.coerce.number().int().positive("Quantidade deve ser maior que zero."),
          valorUnitario: z.coerce.number().min(0).optional(),
          garantiaDias: z.coerce.number().int().min(0).max(3650).optional(),
        }),
      )
      .optional(),
    formaPagamento: z.enum(["pix", "cartao", "dinheiro", "terceirizado"]),
    valorRecebido: z.coerce.number().min(0, "Valor recebido nao pode ser negativo."),
    desconto: z.coerce.number().min(0, "Desconto nao pode ser negativo.").optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.ordemServicoId && (!input.itens || input.itens.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe uma OS ou itens para venda direta.",
        path: ["itens"],
      });
    }
  });

export const vendaSearchSchema = z.object({
  ordemServicoId: z.string().trim().optional().default(""),
  status: z.enum(["finalizada", "cancelada"]).optional().or(z.literal("")).default(""),
});
