import { z } from "zod";

export const tenantPlanSchema = z.enum(["free", "starter", "premium", "enterprise"]);
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
