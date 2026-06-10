import { Router } from "express";

import { httpStatus } from "../../shared/http-status.js";
import { resolveTenant, getRequestTenantId, type TenantRequest } from "../../middlewares/tenant.js";
import { usuariosService } from "./usuarios.service.js";

export const usuariosTecnicosRoutes = Router();

usuariosTecnicosRoutes.use(resolveTenant);

usuariosTecnicosRoutes.get("/", async (request, response, next) => {
  try {
    const tenantId = getRequestTenantId(request as TenantRequest);
    const tecnicos = await usuariosService.listByRole("tecnico", tenantId);

    response.status(httpStatus.ok).json({
      data: tecnicos.map((tecnico) => ({
        uid: tecnico.uid,
        email: tecnico.email,
        displayName: tecnico.displayName,
        role: tecnico.role,
      })),
      meta: {
        total: tecnicos.length,
      },
    });
  } catch (error) {
    next(error);
  }
});
