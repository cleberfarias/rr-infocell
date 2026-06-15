import cors from "cors";
import express from "express";

import { corsOptions } from "./config/http.js";
import { limiter } from "./config/rate-limit.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { routes } from "./routes.js";
import { kiwifyWebhookRoutes } from "./modules/webhooks/kiwify.routes.js";
import { demoRoutes } from "./modules/demo/demo.routes.js";
import { observabilidadeRequestLogger } from "./modules/observabilidade/observabilidade.middleware.js";
import { observabilidadeService } from "./modules/observabilidade/observabilidade.service.js";
import { conexaoService } from "./modules/whatsapp/conexao.service.js";
import { automacoesAtendimentoService } from "./modules/whatsapp/automacoes.service.js";

export const createApp = () => {
  observabilidadeService.instalarCapturaConsole();

  const app = express();

  app.disable("x-powered-by");
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "25mb" }));
  app.use(limiter);
  app.use(observabilidadeRequestLogger);
  app.use("/webhook", kiwifyWebhookRoutes);
  app.use("/demo", demoRoutes);
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  conexaoService.inicializar().catch((err) => {
    console.error("[WhatsApp] Falha ao inicializar:", err);
  });
  automacoesAtendimentoService.iniciarRotina();

  return app;
};
