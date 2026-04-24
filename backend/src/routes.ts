import { Router } from "express";

import { aparelhosRoutes } from "./modules/aparelhos/aparelhos.routes.js";
import { checklistsRoutes } from "./modules/checklists/checklists.routes.js";
import { clientesRoutes } from "./modules/clientes/clientes.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { ordensServicoRoutes } from "./modules/ordens-servico/ordens-servico.routes.js";

export const routes = Router();

routes.use("/health", healthRoutes);
routes.use("/clientes", clientesRoutes);
routes.use("/aparelhos", aparelhosRoutes);
routes.use("/ordens-servico", ordensServicoRoutes);
routes.use("/checklists", checklistsRoutes);
