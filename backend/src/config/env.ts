import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  ATENDIMENTO_PIX_CHAVE: z.string().optional(),
  ATENDIMENTO_PIX_NOME: z.string().optional(),
  ATENDIMENTO_LEMBRETE_ORCAMENTO_HORAS: z.coerce.number().positive().default(24),
  ATENDIMENTO_LEMBRETE_RETIRADA_DIAS: z.coerce.number().positive().default(2),
  ATENDIMENTO_AUTOARQUIVAR_DIAS: z.coerce.number().positive().default(7),
  WHATSAPP_AUTH_DIR: z.string().default("./whatsapp-auth"),
  OBSERVABILIDADE_ALLOWED_EMAILS: z.string().default("cleber.super@rrinfocell.com.br"),
  OBSERVABILIDADE_ALLOWED_UIDS: z.string().optional(),
  KIWIFY_WEBHOOK_TOKEN: z.string().default("gzowchq4hd8"),
  APP_URL: z.string().default("https://rr-infocell.web.app"),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TRIAL_NOTIFICATION_EMAIL: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
