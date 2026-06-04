import { Router } from "express";
import { getFirestore } from "firebase-admin/firestore";

import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";

export const marcasRoutes = Router();

// Fase 9.5: resolveTenant popula request.tenantId a partir de usuarios/{uid}.
// Fase 9.6: handlers usam getRequestTenantId(req) em vez de DEFAULT_TENANT_ID.
marcasRoutes.use(resolveTenant);

const COLLECTION = "marcas";
const getDocTenantId = (data: { tenantId?: string }) => data.tenantId ?? DEFAULT_TENANT_ID;

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

marcasRoutes.get("/", async (req, res, next) => {
  try {
    const tenantId = getRequestTenantId(req as TenantRequest);
    try {
      const db = getFirestore();
      let query: FirebaseFirestore.Query = db.collection(COLLECTION);

      if (tenantId !== DEFAULT_TENANT_ID) {
        query = query.where("tenantId", "==", tenantId);
      }

      const snap = await query.get();
      const custom = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as { nome: string; tenantId?: string }),
          padrao: false,
        }))
        .filter((marca) => getDocTenantId(marca) === tenantId)
        .sort((a, b) => a.nome.localeCompare(b.nome));
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
    const tenantId = getRequestTenantId(req as TenantRequest);
    const { nome } = req.body as { nome?: string };
    if (!nome?.trim()) {
      res.status(400).json({ error: { message: "Informe o nome da marca." } });
      return;
    }
    const db = getFirestore();
    const ref = await db
      .collection(COLLECTION)
      .add({ nome: nome.trim(), criadoEm: new Date().toISOString(), tenantId });
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
