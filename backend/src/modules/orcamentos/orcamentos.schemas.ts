import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const orcamentoInputSchema = z.object({
  ordemServicoId: z.string().trim().min(1, "OS e obrigatoria."),
  status: z.enum(["rascunho", "enviado", "aprovado", "reprovado"]).optional(),
  observacoes: optionalText,
});

export const orcamentoSearchSchema = z.object({
  ordemServicoId: z.string().trim().optional().default(""),
  status: z
    .enum(["rascunho", "enviado", "aprovado", "reprovado"])
    .optional()
    .or(z.literal(""))
    .default(""),
});
