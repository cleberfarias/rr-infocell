import { z } from "zod";

import { checklistItemStatus } from "./checklists.types.js";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const checklistItemSchema = z.object({
  nome: z.string().trim().min(2, "Nome do item deve ter pelo menos 2 caracteres."),
  status: z.enum(checklistItemStatus),
  observacao: optionalText,
});

export const checklistFotoSchema = z.object({
  nome: z.string().trim().min(1, "Nome da foto e obrigatorio."),
  url: z.string().trim().url("URL da foto invalida."),
  path: z.string().trim().min(1, "Path da foto e obrigatorio."),
  contentType: optionalText,
  uploadedAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Data de upload invalida."),
});

export const checklistInputSchema = z.object({
  ordemServicoId: z.string().trim().min(1, "Ordem de servico e obrigatoria."),
  aparelhoId: z.string().trim().min(1, "Aparelho e obrigatorio."),
  itens: z.array(checklistItemSchema).min(1, "Checklist deve ter pelo menos 1 item."),
  fotos: z.array(checklistFotoSchema).optional().default([]),
  observacoesGerais: optionalText,
  criadoPor: optionalText,
});

export const checklistSearchSchema = z.object({
  ordemServicoId: z.string().trim().optional().default(""),
  aparelhoId: z.string().trim().optional().default(""),
});
