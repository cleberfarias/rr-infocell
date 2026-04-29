import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const aparelhoInputSchema = z.object({
  clienteId: z.string().trim().min(1, "Cliente e obrigatorio."),
  marca: z.string().trim().min(2, "Marca deve ter pelo menos 2 caracteres."),
  modelo: z.string().trim().min(2, "Modelo deve ter pelo menos 2 caracteres."),
  cor: optionalText,
  imeiSerial: optionalText,
  estadoFisico: optionalText,
  acessorios: optionalText,
  observacoes: optionalText,
});

export const aparelhoSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  clienteId: z.string().trim().optional().default(""),
});
