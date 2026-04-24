import { Router } from "express";

import { httpStatus } from "../../shared/http-status.js";

export const clientesRoutes = Router();

clientesRoutes.get("/", (_request, response) => {
  response.status(httpStatus.ok).json({
    data: [],
    meta: {
      module: "clientes",
      status: "scaffold",
    },
  });
});
