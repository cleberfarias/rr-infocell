import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { demoService } from "./demo.service.js";

export const demoRoutes = Router();

const registroSchema = z.object({
  nome: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  empresa: z.string().min(2).max(100).trim(),
  utmSource: z.string().max(120).trim().optional(),
  utmCampaign: z.string().max(160).trim().optional(),
  utmMedium: z.string().max(120).trim().optional(),
  paginaOrigem: z.string().max(500).trim().optional(),
  landingPage: z.string().max(500).trim().optional(),
});

function getApproximateIp(req: Request): string | undefined {
  const forwardedFor = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const rawIp = forwardedFor || req.ip || req.socket.remoteAddress;

  if (!rawIp) return undefined;

  const ipv4 = rawIp.replace(/^::ffff:/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ipv4)) {
    const parts = ipv4.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  if (rawIp.includes(":")) {
    return `${rawIp.split(":").slice(0, 4).join(":")}::`;
  }

  return undefined;
}

demoRoutes.post("/registrar", async (req: Request, res: Response) => {
  const parsed = registroSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await demoService.registrar({
      ...parsed.data,
      userAgent: req.header("user-agent")?.slice(0, 500),
      ipApprox: getApproximateIp(req),
    });
    res.status(201).json({ ok: true, slug: result.slug });
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ALREADY_EXISTS") {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("[Demo] Erro ao registrar:", err);
    res.status(500).json({ error: "Falha ao criar conta. Tente novamente." });
  }
});
