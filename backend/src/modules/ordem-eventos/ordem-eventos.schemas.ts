import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const ordemEventoInputSchema = z.object({
  ordemServicoId: z.string().trim().min(1, "OS e obrigatoria."),
  tipo: z
    .enum(["comentario", "diagnostico", "status", "orcamento", "venda"])
    .optional(),
  titulo: z.string().trim().min(2, "Titulo deve ter pelo menos 2 caracteres."),
  descricao: optionalText,
  criadoPor: optionalText,
});

export const ordemEventoSearchSchema = z.object({
  ordemServicoId: z.string().trim().optional().default(""),
  tipo: z
    .enum(["comentario", "diagnostico", "status", "orcamento", "venda"])
    .optional()
    .or(z.literal(""))
    .default(""),
});
