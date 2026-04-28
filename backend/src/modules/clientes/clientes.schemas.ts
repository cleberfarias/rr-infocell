import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const clienteInputSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  telefone: z.string().trim().min(8, "Telefone deve ter pelo menos 8 caracteres."),
  documento: optionalText,
  email: z
    .string()
    .trim()
    .email("E-mail invalido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  endereco: optionalText,
  observacoes: optionalText,
});

export const clienteSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
});
