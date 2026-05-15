import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requests por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Muitas requisições. Tente novamente em 15 minutos." } },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requests de IA por minuto
  message: {
    error: { message: "Limite de requisições ao assistente atingido. Aguarde 1 minuto." },
  },
});
