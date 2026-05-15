import { Router } from "express";
import { getFirestore } from "firebase-admin/firestore";

export const categoriasRoutes = Router();

const COLLECTION = "categorias";

// Categorias padrão do sistema (sempre disponíveis)
const CATEGORIAS_PADRAO = [
  { id: "peca", nome: "Peça", padrao: true },
  { id: "produto", nome: "Produto", padrao: true },
  { id: "acessorio", nome: "Acessório", padrao: true },
  { id: "servico", nome: "Serviço", padrao: true },
  { id: "celular_novo", nome: "Celular Novo", padrao: true },
  { id: "celular_seminovo", nome: "Celular Seminovo", padrao: true },
  { id: "celular_restaurado", nome: "Celular Restaurado", padrao: true },
];

categoriasRoutes.get("/", async (_req, res, next) => {
  try {
    try {
      const db = getFirestore();
      const snap = await db.collection(COLLECTION).orderBy("nome").get();
      const customizadas = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), padrao: false }));
      return res.json({ data: [...CATEGORIAS_PADRAO, ...customizadas] });
    } catch {
      return res.json({ data: CATEGORIAS_PADRAO });
    }
  } catch (error) {
    next(error);
  }
});

categoriasRoutes.post("/", async (req, res, next) => {
  try {
    const { nome } = req.body as { nome?: string };
    if (!nome?.trim()) {
      res.status(400).json({ error: { message: "Informe o nome da categoria." } });
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

categoriasRoutes.delete("/:id", async (req, res, next) => {
  try {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
