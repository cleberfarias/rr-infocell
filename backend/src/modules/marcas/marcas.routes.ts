import { Router } from "express";
import { getFirestore } from "firebase-admin/firestore";

export const marcasRoutes = Router();

const COLLECTION = "marcas";

const MARCAS_PADRAO = [
  "Apple",
  "Samsung",
  "Motorola",
  "Xiaomi",
  "LG",
  "Positivo",
  "Nokia",
  "Huawei",
  "Sony",
  "Lenovo",
].map((nome) => ({ id: nome.toLowerCase(), nome, padrao: true }));

marcasRoutes.get("/", async (_req, res, next) => {
  try {
    try {
      const db = getFirestore();
      const snap = await db.collection(COLLECTION).orderBy("nome").get();
      const custom = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), padrao: false }));
      return res.json({ data: [...MARCAS_PADRAO, ...custom] });
    } catch {
      // Firestore indisponível — retorna apenas defaults
      return res.json({ data: MARCAS_PADRAO });
    }
  } catch (error) {
    next(error);
  }
});

marcasRoutes.post("/", async (req, res, next) => {
  try {
    const { nome } = req.body as { nome?: string };
    if (!nome?.trim()) {
      res.status(400).json({ error: { message: "Informe o nome da marca." } });
      return;
    }
    const db = getFirestore();
    const ref = await db
      .collection(COLLECTION)
      .add({ nome: nome.trim(), criadoEm: new Date().toISOString() });
    res.status(201).json({ data: { id: ref.id, nome: nome.trim(), padrao: false } });
  } catch (error) {
    next(error);
  }
});

marcasRoutes.delete("/:id", async (req, res, next) => {
  try {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
