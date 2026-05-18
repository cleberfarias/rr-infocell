import { Router } from "express";
import { getFirestore } from "firebase-admin/firestore";

export const fornecedoresRoutes = Router();

const COLLECTION = "fornecedores";

fornecedoresRoutes.get("/", async (_req, res, _next) => {
  try {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).orderBy("nome").get();
    const fornecedores = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ data: fornecedores });
  } catch {
    return res.json({ data: [] });
  }
});

fornecedoresRoutes.post("/", async (req, res, next) => {
  try {
    const { nome } = req.body as { nome?: string };
    if (!nome?.trim()) {
      res.status(400).json({ error: { message: "Informe o nome do fornecedor." } });
      return;
    }
    const db = getFirestore();
    const ref = await db
      .collection(COLLECTION)
      .add({ nome: nome.trim(), criadoEm: new Date().toISOString() });
    res.status(201).json({ data: { id: ref.id, nome: nome.trim() } });
  } catch (error) {
    next(error);
  }
});

fornecedoresRoutes.put("/:id", async (req, res, next) => {
  try {
    const { nome } = req.body as { nome?: string };
    if (!nome?.trim()) {
      res.status(400).json({ error: { message: "Informe o nome do fornecedor." } });
      return;
    }
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).update({ nome: nome.trim() });
    res.json({ data: { id: req.params.id, nome: nome.trim() } });
  } catch (error) {
    next(error);
  }
});

fornecedoresRoutes.delete("/:id", async (req, res, next) => {
  try {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
