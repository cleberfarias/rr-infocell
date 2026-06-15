import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { demoService } from "./demo.service.js";

export const demoRoutes = Router();

const registroSchema = z.object({
  nome: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  empresa: z.string().min(2).max(100).trim(),
});

demoRoutes.post("/registrar", async (req: Request, res: Response) => {
  const parsed = registroSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await demoService.registrar(parsed.data);
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
