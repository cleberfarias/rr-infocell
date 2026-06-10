import { Router, type Request, type Response } from "express";

import { env } from "../../config/env.js";
import { kiwifyService } from "./kiwify.service.js";
import type { KiwifyWebhookPayload } from "./kiwify.types.js";

export const kiwifyWebhookRoutes = Router();

kiwifyWebhookRoutes.post("/kiwify", async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;

  if (!token || token !== env.KIWIFY_WEBHOOK_TOKEN) {
    res.status(401).json({ error: "Token inválido." });
    return;
  }

  const payload = req.body as KiwifyWebhookPayload;

  if (!payload?.webhook_event_type) {
    res.status(400).json({ error: "Payload inválido." });
    return;
  }

  // Responde 200 imediatamente para o Kiwify não retentar
  res.status(200).json({ received: true });

  try {
    switch (payload.webhook_event_type) {
      case "order_approved":
        await kiwifyService.handleOrderApproved(payload);
        break;
      case "subscription_canceled":
        await kiwifyService.handleSubscriptionCanceled(payload);
        break;
      case "subscription_renewed":
        await kiwifyService.handleSubscriptionRenewed(payload);
        break;
      default:
        console.info(`[Kiwify] Evento ignorado: ${payload.webhook_event_type}`);
    }
  } catch (err) {
    console.error("[Kiwify] Erro ao processar webhook:", err);
  }
});
