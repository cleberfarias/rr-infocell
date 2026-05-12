import { Router } from "express";

import { httpStatus } from "../../shared/http-status.js";
import { usuariosService } from "./usuarios.service.js";

export const usuariosTecnicosRoutes = Router();

usuariosTecnicosRoutes.get("/", async (_request, response, next) => {
  try {
    const tecnicos = await usuariosService.listByRole("tecnico");

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
