import { Router } from "express";

import { httpStatus } from "../../shared/http-status.js";

export const ordensServicoRoutes = Router();

ordensServicoRoutes.get("/", (_request, response) => {
  response.status(httpStatus.ok).json({
    data: [],
    meta: {
      module: "ordens-servico",
      status: "scaffold",
    },
  });
});
