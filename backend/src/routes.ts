import { Router } from "express";

import { aparelhosRoutes } from "./modules/aparelhos/aparelhos.routes.js";
import { checklistsRoutes } from "./modules/checklists/checklists.routes.js";
import { clientesRoutes } from "./modules/clientes/clientes.routes.js";
import { despesasRoutes } from "./modules/despesas/despesas.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { movimentacoesEstoqueRoutes } from "./modules/movimentacoes-estoque/movimentacoes-estoque.routes.js";
import { orcamentosRoutes } from "./modules/orcamentos/orcamentos.routes.js";
import { ordemEventosRoutes } from "./modules/ordem-eventos/ordem-eventos.routes.js";
import { ordensServicoRoutes } from "./modules/ordens-servico/ordens-servico.routes.js";
import { produtosRoutes } from "./modules/produtos/produtos.routes.js";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes.js";
import { vendasRoutes } from "./modules/vendas/vendas.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.router.js";

export const routes = Router();

routes.use("/health", healthRoutes);
routes.use("/clientes", clientesRoutes);
routes.use("/despesas", despesasRoutes);
routes.use("/aparelhos", aparelhosRoutes);
routes.use("/ordens-servico", ordensServicoRoutes);
routes.use("/checklists", checklistsRoutes);
routes.use("/ordem-eventos", ordemEventosRoutes);
routes.use("/orcamentos", orcamentosRoutes);
routes.use("/vendas", vendasRoutes);
routes.use("/produtos", produtosRoutes);
routes.use("/movimentacoes-estoque", movimentacoesEstoqueRoutes);
routes.use("/usuarios", usuariosRoutes);
routes.use("/whatsapp", whatsappRoutes);
