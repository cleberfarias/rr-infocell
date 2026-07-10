import { z } from "zod";

export const tenantPlanSchema = z.enum(["starter", "profissional", "empresarial"]);
export const tenantStatusSchema = z.enum(["active", "inactive", "suspended"]);

export const tenantInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug deve ter pelo menos 2 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minusculas, numeros e hifens."),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  productName: z.string().trim().min(2, "Nome do produto deve ter pelo menos 2 caracteres."),
  plan: tenantPlanSchema,
  whiteLabel: z.boolean().optional().default(false),
  status: tenantStatusSchema.optional().default("active"),
});

export const tenantSchema = tenantInputSchema.extend({
  id: z.string().min(1, "ID e obrigatorio."),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/[<>]/.test(value), "Campo nao pode conter marcacao HTML.")
    .optional()
    .transform((value) => value || undefined);

const companyNameSchema = z
  .string()
  .trim()
  .min(2, "Nome da empresa deve ter pelo menos 2 caracteres.")
  .max(120)
  .refine((value) => !/[<>]/.test(value), "Nome nao pode conter marcacao HTML.");

const hslColorSchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,3}(?:\.\d+)?\s+\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%$/,
    "Cor deve usar o formato HSL, por exemplo: 205 95% 55%.",
  );

export const tenantSettingsSchema = z.object({
  name: companyNameSchema,
  branding: z.object({
    logoUrl: z
      .string()
      .trim()
      .url("URL da logo invalida.")
      .startsWith("https://", "A logo deve usar uma URL HTTPS.")
      .max(2048)
      .optional()
      .or(z.literal("")),
    primaryColor: hslColorSchema,
    secondaryColor: hslColorSchema,
  }),
  company: z.object({
    cnpj: optionalText(24),
    endereco: optionalText(180),
    bairro: optionalText(100),
    cidade: optionalText(100),
    uf: optionalText(2),
    telefone: optionalText(30),
    whatsapp: optionalText(30),
    horarioAtendimento: optionalText(300),
    tecnicoPadrao: optionalText(120),
    mensagemFinal: optionalText(180),
    rodape: optionalText(180),
  }),
});
