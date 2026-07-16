import { z } from "zod";

import { despesaCategorias } from "./despesas.types.js";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const isValidVencimento = (value: string) => {
  const trimmed = value.trim();
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dia = br ? Number(br[1]) : iso ? Number(iso[3]) : NaN;
  const mes = br ? Number(br[2]) : iso ? Number(iso[2]) : NaN;
  const anoTexto = br?.[3];
  const ano = iso
    ? Number(iso[1])
    : anoTexto
      ? Number(anoTexto.length === 2 ? `20${anoTexto}` : anoTexto)
      : 2000;

  return (
    Number.isInteger(dia) &&
    Number.isInteger(mes) &&
    mes >= 1 &&
    mes <= 12 &&
    dia >= 1 &&
    dia <= new Date(ano, mes, 0).getDate()
  );
};

export const despesaInputSchema = z
  .object({
    descricao: z.string().trim().min(2, "Descricao deve ter pelo menos 2 caracteres."),
    categoria: z.enum(despesaCategorias),
    fornecedor: optionalText,
    valor: z.coerce.number().min(0.01, "Valor deve ser maior que zero."),
    vencimento: z
      .string()
      .trim()
      .min(1, "Vencimento e obrigatorio.")
      .refine(isValidVencimento, "Use o vencimento no formato dd/mm, dd/mm/aaaa ou aaaa-mm-dd."),
    recorrente: z.boolean().optional(),
    tipoLancamento: z.enum(["unica", "fixa", "parcelada"]).optional(),
    totalParcelas: z.coerce.number().int().min(2).max(120).optional(),
    pago: z.boolean().optional(),
  })
  .superRefine((input, context) => {
    if (input.tipoLancamento === "parcelada" && !input.totalParcelas) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalParcelas"],
        message: "Informe a quantidade de parcelas.",
      });
    }
  });

export const despesaSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  categoria: z.enum(despesaCategorias).optional().or(z.literal("")).default(""),
  pago: z.enum(["true", "false"]).optional().or(z.literal("")).default(""),
  competencia: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const despesaRecorrenciaSchema = z.object({
  meses: z.coerce.number().int().min(1).max(24),
});
