import { Router } from "express";
import { getFirestore } from "firebase-admin/firestore";

export const contasRoutes = Router();
const COLLECTION = "contas";

contasRoutes.get("/", async (_req, res, next) => {
  try {
    try {
      const db = getFirestore();
      const snap = await db.collection(COLLECTION).orderBy("nome").get();
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return res.json({ data });
    } catch {
      return res.json({ data: [] });
    }
  } catch (error) {
    next(error);
  }
});

contasRoutes.post("/", async (req, res, next) => {
  try {
    const { nome, tipo, saldo } = req.body as { nome?: string; tipo?: string; saldo?: number };
    if (!nome?.trim()) {
      res.status(400).json({ error: { message: "Informe o nome da conta." } });
      return;
    }
    const db = getFirestore();
    const ref = await db.collection(COLLECTION).add({
      nome: nome.trim(),
      tipo: tipo || "caixa",
      saldo: saldo ?? 0,
      ativa: true,
      criadoEm: new Date().toISOString(),
    });
    const doc = await ref.get();
    res.status(201).json({ data: { id: ref.id, ...doc.data() } });
  } catch (error) {
    next(error);
  }
});

contasRoutes.put("/:id", async (req, res, next) => {
  try {
    const { nome, tipo, saldo, ativa } = req.body as {
      nome?: string;
      tipo?: string;
      saldo?: number;
      ativa?: boolean;
    };
    const db = getFirestore();
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: { message: "Conta não encontrada." } });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (nome !== undefined) updates.nome = nome.trim();
    if (tipo !== undefined) updates.tipo = tipo;
    if (saldo !== undefined) updates.saldo = saldo;
    if (ativa !== undefined) updates.ativa = ativa;
    await ref.update(updates);
    const updated = await ref.get();
    res.json({ data: { id: ref.id, ...updated.data() } });
  } catch (error) {
    next(error);
  }
});

contasRoutes.delete("/:id", async (req, res, next) => {
  try {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
