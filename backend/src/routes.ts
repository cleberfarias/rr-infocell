import { Router } from "express";

import { requireAuth, requireRole } from "./middlewares/auth.js";
import { aparelhosRoutes } from "./modules/aparelhos/aparelhos.routes.js";
import { contasRoutes } from "./modules/contas/contas.routes.js";
import { categoriasRoutes } from "./modules/categorias/categorias.routes.js";
import { checklistsRoutes } from "./modules/checklists/checklists.routes.js";
import { clientesRoutes } from "./modules/clientes/clientes.routes.js";
import { despesasRoutes } from "./modules/despesas/despesas.routes.js";
import { ajudaRoutes } from "./modules/ajuda/ajuda.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { marcasRoutes } from "./modules/marcas/marcas.routes.js";
import { movimentacoesEstoqueRoutes } from "./modules/movimentacoes-estoque/movimentacoes-estoque.routes.js";
import { orcamentosRoutes } from "./modules/orcamentos/orcamentos.routes.js";
import { ordemEventosRoutes } from "./modules/ordem-eventos/ordem-eventos.routes.js";
import { ordensServicoRoutes } from "./modules/ordens-servico/ordens-servico.routes.js";
import { produtosRoutes } from "./modules/produtos/produtos.routes.js";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes.js";
import { usuariosTecnicosRoutes } from "./modules/usuarios/usuarios-tecnicos.routes.js";
import { vendasRoutes } from "./modules/vendas/vendas.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.router.js";

export const routes = Router();

routes.use("/health", healthRoutes);
routes.use(requireAuth);
routes.use("/ajuda", requireRole("admin", "atendente", "tecnico"), ajudaRoutes);
routes.use("/clientes", requireRole("admin", "atendente", "tecnico"), clientesRoutes);
routes.use("/despesas", requireRole("admin"), despesasRoutes);
routes.use("/aparelhos", requireRole("admin", "atendente", "tecnico"), aparelhosRoutes);
routes.use("/ordens-servico", requireRole("admin", "atendente", "tecnico"), ordensServicoRoutes);
routes.use("/checklists", requireRole("admin", "atendente", "tecnico"), checklistsRoutes);
routes.use("/ordem-eventos", requireRole("admin", "atendente", "tecnico"), ordemEventosRoutes);
routes.use("/orcamentos", requireRole("admin", "atendente", "tecnico"), orcamentosRoutes);
routes.use("/vendas", requireRole("admin", "atendente"), vendasRoutes);
routes.use("/produtos", requireRole("admin", "atendente", "tecnico"), produtosRoutes);
routes.use(
  "/movimentacoes-estoque",
  requireRole("admin", "atendente", "tecnico"),
  movimentacoesEstoqueRoutes,
);
routes.use(
  "/usuarios/tecnicos",
  requireRole("admin", "atendente", "tecnico"),
  usuariosTecnicosRoutes,
);
routes.use("/usuarios", requireRole("admin"), usuariosRoutes);
routes.use("/whatsapp", requireRole("admin", "atendente", "tecnico"), whatsappRoutes);
routes.use("/categorias", requireRole("admin", "atendente", "tecnico"), categoriasRoutes);
routes.use("/marcas", requireRole("admin", "atendente", "tecnico"), marcasRoutes);
routes.use("/contas", requireRole("admin", "atendente"), contasRoutes);
