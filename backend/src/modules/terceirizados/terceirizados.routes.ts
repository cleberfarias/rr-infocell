import { Router } from "express";
import { getFirestore } from "firebase-admin/firestore";

export const terceirizadosRoutes = Router();

const COLLECTION = "terceirizados";

terceirizadosRoutes.get("/", async (_req, res, next) => {
  try {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).orderBy("criadoEm", "desc").get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ data: items });
  } catch {
    return res.json({ data: [] });
  }
});

terceirizadosRoutes.post("/", async (req, res, next) => {
  try {
    const body = req.body as {
      clienteNome?: string;
      responsavel?: string;
      descricao?: string;
      valorCobrado?: number;
      valorRepasse?: number;
      statusRepasse?: string;
      observacoes?: string;
    };

    const valorCobrado = Number(body.valorCobrado) || 0;
    const valorRepasse = Number(body.valorRepasse) || 0;

    const entry = {
      clienteNome: body.clienteNome?.trim() || null,
      responsavel: body.responsavel?.trim() || null,
      descricao: body.descricao?.trim() || null,
      valorCobrado,
      valorRepasse,
      lucro: valorCobrado - valorRepasse,
      statusRepasse: body.statusRepasse === "pago" ? "pago" : "pendente",
      observacoes: body.observacoes?.trim() || null,
      criadoEm: new Date().toISOString(),
    };

    const db = getFirestore();
    const ref = await db.collection(COLLECTION).add(entry);
    res.status(201).json({ data: { id: ref.id, ...entry } });
  } catch (error) {
    next(error);
  }
});

terceirizadosRoutes.patch("/:id/status-repasse", async (req, res, next) => {
  try {
    const { statusRepasse } = req.body as { statusRepasse?: string };
    if (!["pendente", "pago"].includes(statusRepasse ?? "")) {
      res.status(400).json({ error: { message: "Status inválido. Use 'pendente' ou 'pago'." } });
      return;
    }
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).update({ statusRepasse });
    res.json({ data: { id: req.params.id, statusRepasse } });
  } catch (error) {
    next(error);
  }
});

terceirizadosRoutes.delete("/:id", async (req, res, next) => {
  try {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
