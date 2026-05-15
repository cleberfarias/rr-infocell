import { z } from "zod";

import { usuarioRoles } from "./usuarios.types.js";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const usuarioInputSchema = z.object({
  email: z.string().trim().email("E-mail invalido."),
  displayName: optionalText,
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres.").optional(),
  role: z.enum(usuarioRoles),
  disabled: z.boolean().optional(),
});

export const usuarioUpdateSchema = z.object({
  displayName: optionalText,
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres.").optional(),
  role: z.enum(usuarioRoles),
  disabled: z.boolean().optional(),
});
