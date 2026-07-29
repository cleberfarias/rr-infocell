import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { contatoService } from "./contato.service.js";

export const contatoRoutes = Router();

const registroSchema = z.object({
  nome: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  telefone: z.string().min(8).max(30).trim(),
  assunto: z.string().min(2).max(120).trim(),
  mensagem: z.string().min(5).max(2000).trim(),
});

contatoRoutes.post("/registrar", async (req: Request, res: Response) => {
  const parsed = registroSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos.", details: parsed.error.flatten() });
    return;
  }

  try {
    await contatoService.registrar(parsed.data);
    res.status(201).json({ ok: true });
  } catch (err: unknown) {
    console.error("[Contato] Erro ao registrar:", err);
    res.status(500).json({ error: "Falha ao enviar mensagem. Tente novamente." });
  }
});
