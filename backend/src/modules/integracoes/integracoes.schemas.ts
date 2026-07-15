import { z } from "zod";

const optionalSecret = z.string().max(20_000_000).optional().or(z.literal(""));

export const fiscalSettingsSchema = z.object({
  uf: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  ambiente: z.enum(["homologacao", "producao"]),
  regimeTributario: z.enum(["simples_nacional", "simples_excesso", "regime_normal"]),
  emiteNfce: z.boolean(),
  emiteNfse: z.boolean(),
  municipio: z.string().trim().max(120).optional().or(z.literal("")),
  provedorNfse: z.string().trim().max(120).optional().or(z.literal("")),
  serieNfce: z.coerce.number().int().min(1).max(999).default(1),
  proximoNumeroNfce: z.coerce.number().int().min(1).default(1),
  certificadoPfxBase64: optionalSecret,
  senhaCertificado: optionalSecret,
  csc: optionalSecret,
  cscId: optionalSecret,
});

export const paymentSettingsSchema = z.object({
  provider: z.enum(["stone", "mercado_pago", "pagbank", "cielo", "rede"]),
  mode: z.enum(["api", "smartpos", "tef"]),
  clientId: optionalSecret,
  clientSecret: optionalSecret,
  merchantId: optionalSecret,
  accessToken: optionalSecret,
  terminalId: z.string().trim().max(160).optional().or(z.literal("")),
});

export const mercadoPagoOrderSchema = z.object({
  terminalId: z.string().trim().min(1, "Selecione um terminal Point."),
  amount: z.coerce.number().positive("O valor da cobranca deve ser positivo.").max(999999.99),
  description: z.string().trim().min(2).max(150),
  reference: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Referencia invalida."),
});
