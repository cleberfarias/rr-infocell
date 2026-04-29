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

export const ordemServicoInputSchema = z.object({
  clienteId: z.string().trim().min(1, "Cliente e obrigatorio."),
  aparelhoId: z.string().trim().min(1, "Aparelho e obrigatorio."),
  checklistId: optionalText,
  defeitoRelatado: z.string().trim().min(3, "Defeito relatado deve ter pelo menos 3 caracteres."),
  diagnostico: optionalText,
  status: z.enum(ordemServicoStatus).optional(),
  tecnicoResponsavel: optionalText,
  valorPecas: money,
  valorMaoObra: money,
  entradaEm: optionalDateText,
  previsaoEntregaEm: optionalDateText,
});

export const ordemServicoSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(ordemServicoStatus).optional().or(z.literal("")).default(""),
  clienteId: z.string().trim().optional().default(""),
  aparelhoId: z.string().trim().optional().default(""),
});
