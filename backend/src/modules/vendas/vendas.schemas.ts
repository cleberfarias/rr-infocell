import { z } from "zod";

export const vendaInputSchema = z.object({
  ordemServicoId: z.string().trim().min(1, "Ordem de servico e obrigatoria."),
  formaPagamento: z.enum(["pix", "cartao", "dinheiro"]),
  valorRecebido: z.coerce.number().min(0, "Valor recebido nao pode ser negativo."),
});

export const vendaSearchSchema = z.object({
  ordemServicoId: z.string().trim().optional().default(""),
  status: z.enum(["finalizada", "cancelada"]).optional().or(z.literal("")).default(""),
});
